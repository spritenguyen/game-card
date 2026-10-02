# Phase 1 — Sửa lỗi tồn đọng

Các thay đổi chỉ sửa lỗi có bằng chứng trong luồng hiện tại. Không thay cấu trúc thư mục, không rewrite module hay AI, không đổi công thức cân bằng game. Các callback nội bộ được bổ sung/định kiểu Promise khi cần chờ giao dịch lưu hoàn tất.

## Bug đã sửa

| Mức độ | Vấn đề và nguyên nhân gốc | File/module | Patch |
|---|---|---|---|
| Critical | Nội dung lore/thông báo được đưa trực tiếp vào `dangerouslySetInnerHTML`; HTML không tin cậy có thể chứa event handler thực thi JavaScript. | `FullCard.tsx`, `Dialog.tsx`, `sanitizeHtml.ts` | Dựng lại HTML bằng DOM, chỉ giữ các thẻ định dạng cần thiết; bỏ script, SVG, ảnh, event handler và thuộc tính thực thi. |
| Critical | Fusion xóa từng thẻ trước khi lưu kết quả; lỗi ghi có thể mất vĩnh viễn thẻ nguyên liệu. IndexedDB helper trả thành công khi request thành công, trước transaction commit. | `db.ts`, `useGameState.ts`, `App.tsx`, `FusionView.tsx` | Xóa nguyên liệu và lưu kết quả trong cùng transaction; kiểm tra nguyên liệu còn tồn tại; chỉ cập nhật state sau commit, hoàn chi phí đã trừ nếu giao dịch thất bại. |
| Critical | Gắn/tháo trang bị ghi card và inventory bằng các thao tác độc lập; thay trang bị có thể mất/nhân đôi item khi một thao tác thất bại. | `db.ts`, `useGameState.ts`, `ClinicView.tsx`, `ArmoryView.tsx`, `App.tsx` | Transaction chung cho card và kho trang bị; kiểm tra item/slot; trả item cũ về kho trong cùng transaction; khóa thao tác đang chạy, chờ commit rồi đồng bộ state. Giữ URL ảnh Blob đang có hiệu lực ở trình duyệt. |
| Critical | Trích xuất dùng alert mang tên xác nhận nhưng vẫn tiêu hủy thẻ sau timeout, không có bước đồng ý/hủy. | `SplicingView.tsx` | Dùng Dialog confirm hiện có; chỉ bắt đầu sau xác nhận. Chờ xóa thẻ thành công rồi trừ tiền/cộng Gene. |
| High | Effect lưu squad chạy trước khi IndexedDB hydrate, ghi đè đội hình lưu bằng 6 slot rỗng; StrictMode làm race dễ xuất hiện. | `useGameState.ts` | Chụp ID đã lưu trước khi load; chỉ persist squad sau hydrate; bỏ kết quả load của effect đã bị hủy. |
| High | `updateCard` chỉ cập nhật collection, trong khi squad và fusion slot vẫn giữ bản card cũ. | `useGameState.ts` | Đồng bộ các tham chiếu theo ID sau khi lưu thành công; không đổi state nếu lỗi ghi. |
| High | SkillsView tạo instance `useGameState` thứ hai: mở khóa skill không cập nhật state App, các effect có thể ghi đè dữ liệu. | `SkillsView.tsx`, `App.tsx` | Truyền level/unlockedSkills/setter từ App; cập nhật skill qua functional setter. |
| High | Wrapper Overclock không await callback, dùng luồng Fusion để xóa cả target rồi thêm lại: báo xong quá sớm, target mất khỏi squad/leader, ghi sai quest. | `ForgeTabView.tsx`, `OverclockView.tsx`, `App.tsx`, `useGameState.ts` | Callback lưu riêng, await transaction cập nhật target và tiêu thụ sacrifice; giữ target trong squad/leader; quest upgrade chỉ tiến khi nâng cấp thành công; hoàn phí nếu lỗi ghi, giữ nguyên luật tiêu phí khi roll thất bại. |
| High | Phantasm chỉ hiển thị HP đã lưu nhưng engine khởi tạo full HP; gọi callback thắng cả khi thua/hòa nên tăng tầng sai. | `CombatView.tsx`, `App.tsx` | Engine và UI dùng HP đã lưu, clamp trong 0..max; chỉ tăng tầng khi hết HP địch. Thua/hòa lưu HP còn lại và giữ tầng. Auto-start trì hoãn một tick và hủy được để hoạt động đúng trong StrictMode. |
| High | Splicing đọc Gene ở cấp gốc của inventory thay vì `materials`; shallow copy rồi push genes làm biến đổi card gốc trước khi lưu. | `SplicingView.tsx` | Đọc và kiểm tra `inventory.materials`; tạo mảng genes mới; await lưu rồi mới trừ phí/Gene; xử lý lỗi và mở khóa trong finally. |
| High | Bán/chế tạo trang bị và Studio báo thành công hoặc tiêu tài nguyên trước khi Promise ghi hoàn tất. Phần thưởng trang bị/affection trong Combat cũng ghi mà không await. | `ClinicView.tsx`, `ArmoryView.tsx`, `StudioView.tsx`, `CombatView.tsx` | Await lưu/xóa trước success/thu tiền/tiêu nguyên liệu; dùng catch/finally. Studio đi vào nhánh hoàn dust hiện có khi lưu thất bại; xử lý lỗi lưu lens. Combat chờ các lần ghi phần thưởng/affection. |
| High | Engine async không có finally và tiếp tục chạy sau khi rời màn hình: lỗi có thể giữ processing/audio, unmount có thể nhận thưởng muộn. | `CombatView.tsx` | Catch lỗi, finally giải phóng trạng thái; cleanup audio/trạng thái battle; kiểm tra hủy trong loop và trước phần thưởng; finally của trận đã hủy không đụng trạng thái trận mới. |
| Medium | Balance 0 bị `parseInt(...) || 1500` đổi thành 1500 khi reload. | `useGameState.ts` | Parse số hữu hạn không âm và phân biệt 0 với dữ liệu không hợp lệ. |
| Medium | JSON hỏng/null của campaign, Phantasm hoặc World Boss có thể làm màn hình crash. | `useGameState.ts`, `CombatView.tsx` | Parse trong try/catch và kiểm tra cấu trúc tối thiểu, fallback tiến trình mặc định. |
| Medium | Reset xóa DB nhưng để implants/gears/campaign/Phantasm trong memory; reset lỗi để processing bật. | `useGameState.ts`, `db.ts`, `App.tsx` | Reset đủ các state và cache ngôn ngữ; xử lý abort; finally mở khóa; App hiển thị lỗi nếu reset thất bại. |
| Medium | Reroll role/gene chỉ kiểm tra 100 dust nhưng thực tế trừ 150/200; lỗi lưu không hoàn phí. | `BlackMarketView.tsx` | Dùng đúng phí từng loại khi guard và hoàn đúng dust/material đã trừ nếu ghi lỗi. |
| Medium | Loop dừng ở 60 actions nhưng nhánh hòa kiểm tra `turn > 15`, không thể đạt trong luồng đó. Địch chết vì burn lại trừ ATK đội ta; reflect có thể làm HP địch âm và sai tổng HP; heal không cập nhật tổng HP. | `CombatView.tsx` | Phân biệt hòa theo giới hạn actions hiện có, sửa text tương ứng; bỏ phép trừ ATK sai; clamp HP phản xạ; cập nhật tổng HP sau heal. Không đổi giới hạn hay hệ số. |
| Medium | Ngày reset World Boss lúc khởi tạo dùng UTC, countdown dùng UTC+7: reload trong khoảng lệch ngày có thể reset lượt sai. | `CombatView.tsx` | Khởi tạo dùng cùng ngày UTC+7 với countdown. |
| Low | Icon fallback tham chiếu export `Help` không tồn tại trong lucide-react, phát cảnh báo build. | `Icon.tsx` | Dùng export `CircleHelp` có thật. |

## Ảnh hưởng tới module khác

- Mọi nơi dùng `updateCard` nhận card mới trong collection, squad và fusion slot sau commit. Các trường dữ liệu card không đổi cấu trúc.
- Fusion và Overclock dùng cùng primitive transaction, nhưng callback quest/success riêng cho từng hành động.
- Kho implant/gear và card được đọc/ghi trong cùng transaction; không đổi schema hay version DB.
- Sanitizer áp dụng tại hai nơi render HTML; vẫn giữ `br`, `strong`, `b`, `em`, `i`, `span`, `p` và class định dạng span. HTML chứa link/ảnh/thuộc tính tùy ý sẽ bị loại bỏ.
- Phantasm bổ sung callback nội bộ khi thua để lưu HP mà không tiến tầng. Reward/cost theo các quy tắc hiện tại được giữ nguyên.

## File đã thay đổi

| File | Thay đổi |
|---|---|
| `src/App.tsx` | Kết nối transaction, shared skills, callback Overclock/Phantasm và lỗi reset. |
| `src/hooks/useGameState.ts` | Hydrate/persist, balance 0, guard save, đồng bộ card, wrapper transaction, reset. |
| `src/lib/db.ts` | Chờ commit/abort; transaction thay thẻ và chuyển trang bị. |
| `src/lib/sanitizeHtml.ts` | Helper lọc HTML tại điểm render. |
| `src/components/FullCard.tsx` | Sanitize lore trước khi render HTML. |
| `src/components/ui/Dialog.tsx` | Sanitize message trước khi render HTML. |
| `src/components/ui/Icon.tsx` | Fallback icon hợp lệ. |
| `src/views/SkillsView.tsx` | Dùng state App. |
| `src/views/ForgeTabView.tsx` | Truyền callback Overclock có await, không dùng callback Fusion. |
| `src/views/FusionView.tsx` | Theo dõi và hoàn đúng khoản đã trừ khi giao dịch lỗi. |
| `src/views/OverclockView.tsx` | Phân biệt roll thất bại và commit thất bại; hoàn phí đúng. |
| `src/views/ClinicView.tsx` | Chuyển implant atomic; chờ bán/chế tạo; xử lý lỗi/khóa nút. |
| `src/views/ArmoryView.tsx` | Chuyển gear atomic; chờ bán/chế tạo; xử lý lỗi/khóa nút. |
| `src/views/SplicingView.tsx` | Confirm thật, đúng kho Gene, không mutate mảng gốc, chờ lưu. |
| `src/views/BlackMarketView.tsx` | Guard đúng dust và refund khi lưu lỗi. |
| `src/views/CombatView.tsx` | HP/kết quả Phantasm, guard World Boss, lỗi/timer/unmount, await ghi reward, sửa lỗi tổng HP/ATK/action-limit. |
| `src/views/StudioView.tsx` | Await lưu photoshoot/lens; báo lỗi lưu. |
| `phase1-regression.py` | Bộ regression Chromium/IndexedDB thật, fault injection và payload HTML; không gọi AI bên ngoài. |
| `PHASE1_REPORT.md` | Báo cáo phase, bằng chứng và phần việc hoãn. |

## Kiểm tra đã chạy

- `npm run lint`: **PASS**. Script này là `tsc --noEmit`, không phải ESLint; repo chưa cấu hình ESLint.
- `npm run build`: **PASS** sau nhóm state/transaction và sau nhóm Combat/UI; bản cuối không còn cảnh báo export `Help`.
- `python phase1-regression.py`: **PASS 14 nhóm**, không có `pageerror`. Bao gồm StrictMode hydrate, update state, transaction rollback khi missing input/DataCloneError/lỗi ghi card, equip/swap/unequip, skill state, HTML payload, confirm/cancel, lỗi splice/craft/reroll, Phantasm thắng/thua/hòa, exception/unmount và reset, UTC+7 tại 18:00 UTC.
- Smoke trên Vite dev: HTTP 200, UI mount, không `pageerror`.
- Smoke bản production qua `vite preview`: mở 12 tab gồm Skills, Clinic, Armory, Black Market, Forge, Studio, Phantasm, Combat, Training, Missions, Gallery, Extract; HTTP 200, không `pageerror`.
- `git diff --check`: **PASS**.
- Không có kiểm tra thủ công bằng người dùng hay live AI request. Browser test chặn request ra dịch vụ ngoài; combat test dùng fixture và timer tăng tốc. Không suy rộng kết quả thành xác minh cân bằng game hoặc provider AI.

Chạy regression: khởi động `npm run dev`, sau đó `python phase1-regression.py`. Cần Python Playwright và Chromium; có thể đặt `GAME_TEST_URL` và `CHROMIUM_PATH`. Không thêm dependency vào package.json.

Build vẫn có hai cảnh báo tồn tại trước phase: bundle >500 kB, và AI module vừa static import vừa dynamic import nên không tách chunk. Không phải lỗi build mới.

## Vấn đề còn tồn tại

### Chưa xác minh được

- Chưa thử Safari/WebKit, thiết bị thật, quota storage đầy hoặc mất điện/đóng browser đúng giữa transaction và effect localStorage. Fault injection xác minh rollback IndexedDB, không chứng minh atomicity giữa hai loại storage.
- Mapping các nhánh faction cũ `Tech`/`Mutant` và material cũ cần xác nhận quy tắc gameplay. Không tự đổi loại sát thương/heal, giá hay drop.

### Cần refactor — Đề xuất cho Phase 3

- Game save vẫn phân tán giữa localStorage và IndexedDB. Muốn atomic cả tiền/nguyên liệu/thẻ khi browser crash, hoặc đồng bộ nhiều tab, cần thiết kế persistence chung; phase này chỉ atomic các thao tác trong DB và xử lý lỗi Promise.
- Combat engine/UI/audio vẫn cùng module lớn; cần tách và có unit tests cho từng quy tắc trước khi thay đổi rộng.
- Faction/material/schema cũ cần migration xác định, thay cho sửa rải rác hoặc random hóa dữ liệu cũ. Expedition còn các yêu cầu theo tên faction cũ.
- Bundle lớn và static imports; thiếu kiểu React/strict checking và test runner chuẩn. Không thay cấu hình/compiler/dependency trong phase này.

### Thuộc AI subsystem — Phase 2

- Timeout/retry/fallback, key cache, theo dõi trạng thái API, validation output AI và cách giữ API key ở client cần review riêng.
- Holocomm ghi card từ `displayCard` sau translation có thể ghi đè trường nguyên bản; các lần AI response về muộn có thể đè cập nhật card khác. Ghi lại để xử lý luồng AI ở Phase 2, không rewrite trong Phase 1.
- Chưa xác minh provider thật, rate limit, chất lượng output hay chi phí API.

### Không nằm trong phạm vi Phase 1

- Training hiện giới hạn level 10 nhưng lần splice sau yêu cầu level 30/50; cần chốt progression trước khi đổi level cap hoặc yêu cầu. Không tự cân bằng lại.
- Nội dung mô tả xác suất/drop, bộ Gene theo hệ, dữ liệu material cũ và các tính năng đang ghi TODO cần quyết định sản phẩm.
- Không deploy, commit, tạo PR hoặc thay đổi AI service trong phase này.

## Điều kiện dừng

Các lỗi Critical/High được chọn có cơ sở rõ ràng trong luồng hiện tại đã được patch. Build/lint và regression ở các luồng đã kiểm tra đều qua. Các vấn đề cần quy tắc gameplay, live AI hoặc thay đổi persistence/kiến trúc được ghi lại, không sửa bằng suy đoán.
