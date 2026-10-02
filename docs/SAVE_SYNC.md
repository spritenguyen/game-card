# Đồng bộ save nhiều tab: version và conflict policy

## Trạng thái

PASS WITH WARNINGS. Save nhiều tab dùng **single writer / read-only mirrors**.
Không thêm backend hoặc thay hệ thống account/credentials.

## Conflict policy

1. Tab đầu tiên giữ exclusive Web Lock `cinetech-save-writer-v1` được quyền ghi.
2. Các tab khác nạp và theo dõi save ở chế độ chỉ đọc. Toàn bộ UI thao tác bị inert;
   thông báo nêu tab khác đang giữ quyền ghi và version hiện tại.
3. Setter/use case đồng bộ từ tab chỉ đọc bị bỏ qua, không thay state/save. API ghi
   async và repository trả `SaveConflictError`, tương thích error handlers hiện có.
4. Không merge currency, inventory, cards hoặc rewards; không dùng last-write-wins.
5. Đóng/unmount tab ghi giải phóng khóa. Tab đang chờ được nhận khóa theo Web Locks,
   nạp lại toàn bộ save mới nhất rồi mới được ghi. Một tab ở background vẫn giữ khóa.
6. Callback từ hook đã unmount không có quyền ghi lại. Reset giữ metadata version,
   tăng revision tiếp theo và truyền state reset sang các tab đang theo dõi.
7. Schema/version hỏng, rollback version, foreign writer ngoài khóa hoặc không có
   Web Locks: fail closed, hiển thị blocked state, không tự ghi đè hoặc hạ version.
   Browser không hỗ trợ cần mở ứng dụng qua HTTPS trên browser hỗ trợ Web Locks.

Không có tính năng cưỡng đoạt khóa hoặc sửa đồng thời ở nhiều tab. Policy này phù hợp
với workflows hiện tại có nhiều bước charge/save/reward và setter đồng bộ.

## Version contract

localStorage key: `cineSaveVersion`.

```ts
interface SaveVersion {
  schemaVersion: 1;
  revision: number; // positive safe integer, monotonic
  writerId: string; // identity của document writer, không phải credential
  updatedAt: number; // timestamp, không dùng để chọn winner
}
```

Save cũ không có metadata bắt đầu tại revision 0. Không migrate/xóa card hoặc đổi
format các khóa save cũ. Writer coalesce các thay đổi thành flush ở task kế tiếp;
flush kiểm tra revision quan sát vẫn khớp metadata dưới exclusive lock rồi tăng revision.
IDB mutation chỉ đánh dấu changed khi transaction complete; transaction abort không
bump revision. Chỉ đọc hoặc ghi lại giá trị không đổi không tạo version echo.

Version đo persistence flush, **không phải transaction atomic của cả gameplay action**.
IndexedDB và localStorage vẫn là hai cơ chế persistence riêng. Một action nhiều bước
có thể tạo nhiều revision; các tab mirror hội tụ khi nhận version cuối cùng.

## Data flow

Writer state/use case → guarded browserStorage hoặc repository transaction → changed
→ coalesced version commit → browser storage event → mirror reload snapshot/state.

Focus/visibility cũng đọc lại metadata để bắt notification đã bỏ lỡ. Remote loads có
cancellation và kiểm tra revision trước/sau I/O; load hết hiệu lực không áp dụng state.
Mirror hydration không persist defaults hoặc repair cards trở lại save. Khi takeover,
legacy card preparation được thực hiện dưới exclusive lock như luồng load cũ.

Đồng bộ: currency, EXP/level, inventory, pity, skills, cards/squad/leader, implants/gears,
quests/expeditions, campaign/Phantasm progression, enemy squads và config/language.
Các khóa phụ World Boss/cooldown/navigation dùng cùng guarded storage adapter; khi tab
được quyền ghi và mở view, view đọc dữ liệu phụ hiện tại từ save như trước.

## File thay đổi

- Mới `src/infrastructure/storage/saveCoordinator.ts`: version validation, Web Locks,
  ownership/handover, notifications, commit coalescing và controlled conflict error.
- `src/infrastructure/storage/browserStorage.ts`: writer-only mutations, no-op values,
  reset bảo toàn version metadata.
- `src/infrastructure/storage/indexedDbGameRepository.ts`: guard IDB writes, version
  notification sau commit, reuse connection khi reload remote snapshots.
- `src/hooks/useGameState.ts`: subscription, hydration/sync/takeover, guarded public
  setters/use cases, stale hook guards và revoke generated image URLs khi reload.
- `src/App.tsx`: sync status/version banner và inert UI khi chưa có quyền ghi; đưa khóa
  phụ qua storage adapter.
- `src/views/CombatView.tsx`, `PhantasmView.tsx`, `BreachView.tsx`, `MissionsView.tsx`:
  thay localStorage mutations trực tiếp bằng guarded adapter.
- `phase4-browser-regression.py`: chờ writer + hydrated thay vì chỉ DB online trước khi
  thực hiện mutation. DB online vẫn chỉ mô tả kết nối storage.
- Mới `multi-tab-regression.py`, `save-sync-regression.test.ts`.
- `package.json`: thêm `test:save-sync`, không đổi dependency/version.
- Mới tài liệu này. Không xóa file hoặc đổi game rules/AI providers.

## Validation

- `npm run lint`: tsc --noEmit PASS. Repo không có ESLint riêng.
- `npm run build`: PASS, cảnh báo bundle >500 kB đã có vẫn còn.
- `npm run test:save-sync`: 4/4 PASS cho legacy/version/schema/typed conflict.
- `python multi-tab-regression.py`: 9 nhóm PASS, **tabs thật cùng browser context**,
  dùng Web Locks, storage events và IndexedDB thật, không mock protocol.
  Bao gồm không echo defaults, stale writes, mọi store chính, aborted IDB transaction,
  handover, reset, stale callbacks, simultaneous StrictMode startup, live rollback,
  thiếu Web Locks và incompatible schema. Không page errors.
- `npm run test:architecture`: 8/8 PASS, bao gồm import/cycle checks.
- `npm run test:workflows`: 115/115 PASS.
- `npm run test:ai`: 38/38 PASS, provider transports mocked.
- `npm run test:icons`: 3/3 PASS, 515 baseline renders.
- `python phase1-regression.py`: 14 nhóm PASS.
- `python phase2-browser-regression.py`: 7 nhóm PASS.
- `python phase4-browser-regression.py`: 3 nhóm PASS.
- `python phase3-browser-smoke.py`: 14 production tabs/navigation/cache PASS.
- `git diff --check`: PASS.

Browser module harness cần Vite dev server mới khởi động sau khi chỉnh các singleton
infrastructure: import module thủ công không có HMR timestamp có thể tạo identity khác
với dependency URL đã được Vite rewrite trong graph cũ. Validation cuối chạy trên server
mới; không sửa production singleton để bỏ qua kiểm tra identity.

## Giới hạn / việc để sau

- Chỉ đồng bộ cùng origin/browser profile. Không phải cloud save hay sync giữa thiết bị.
- Các tab phải chạy ứng dụng có protocol này. Trước khi rollout, đóng/reload tab chạy
  client cũ; client cũ không tham gia Web Locks có thể ghi dữ liệu ngoài protocol.
- Không tự phục hồi/merge metadata corrupt hoặc rollback. Cần xử lý nguồn dữ liệu và
  reload sau khi xác minh, tránh làm mất save bằng reset version tự động.
- Vẫn có giới hạn persistence nhiều bước giữa IndexedDB/localStorage nếu process crash
  giữa action. Version không biến các gameplay workflows thành transaction atomic.
- Không merge kết quả AI từ workflow đã bị đóng; các epoch/cancellation guards cũ được
  giữ nguyên. Không có server conflict resolution, auth, quota hoặc credentials migration.
