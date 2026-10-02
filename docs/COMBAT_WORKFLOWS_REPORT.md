# Combat state machine và UI use cases

## Trạng thái

PASS WITH WARNINGS. Không phát hiện regression trong các kiểm tra đã chạy.
Credentials phía server, backend/auth/quota được **hoãn theo yêu cầu người dùng**.
Cơ chế credentials hiện tại được giữ nguyên; chưa có backend được triển khai.

## Cấu trúc trước và sau

Trước: CombatView chứa lifecycle, chọn lượt ATB, mô phỏng damage/status, trao thưởng,
progression và presentation. FullCard quản lý cả UI chat và orchestration lưu hội thoại/AI.
StudioView quản lý cả UI chụp ảnh, generation, cập nhật card và charge/refund Quantum Dust.

Sau:

- `domain/combatTurnState.ts`: pure state transition chọn actor hoặc tiến đồng hồ ATB.
  Không import React, storage hoặc AI. Không mutate input.
- `application/combat/combatLifecycle.ts`: state machine
  idle → running → resolving → completed, với failed/cancelled; run ownership chống
  chạy trùng và continuation cũ sau cancel/reset/restart.
- `application/combat/resolveCombatOutcome.ts`: use case nhận snapshot trận đấu và ports;
  xử lý victory/defeat/draw, currency/EXP, inventory, loot, affection, campaign và Phantasm HP.
- `application/agents/sendAgentMessage.ts`: lưu user message → AI service → cập nhật
  hội thoại trên card mới nhất; xử lý provider/save error và bỏ response hết hiệu lực.
- `application/studio/photoshoot.ts`: charge Dust → image service → đọc card mới nhất →
  lưu variants/affection; error → alert/refund; finally → release processing.
- UI giữ input, busy state, dialogs, localized text, animation và các presentation callbacks.

Data flow combat: UI → lifecycle.start → pure ATB transitions trong simulation hiện có →
lifecycle.resolve → outcome use case → persistence/progression ports → UI result → complete.
Unmount → cancel; các continuation mang run cũ không được thực hiện effect tiếp theo.

Đây là refactor từng cụm. Damage, skills, status, weather và animation trong vòng mô phỏng
vẫn nằm tại CombatView; không tuyên bố đã tách toàn bộ combat engine.
CombatView giảm từ 2.846 xuống 2.532 dòng; StudioView từ 394 xuống 365 dòng.

## File thay đổi

### Source mới

- `src/domain/combatTurnState.ts`
- `src/application/combat/combatLifecycle.ts`
- `src/application/combat/resolveCombatOutcome.ts`
- `src/application/agents/sendAgentMessage.ts`
- `src/application/studio/photoshoot.ts`

### Caller đã migrate

- `src/views/CombatView.tsx`: gọi lifecycle, ATB transition và outcome use case; bỏ imports loot trực tiếp.
- `src/components/FullCard.tsx`: handleChat gọi sendAgentMessage; UI vẫn quản lý request epoch/busy state.
- `src/views/StudioView.tsx`: handlePhotoshoot gọi photoshoot; bỏ image service import trực tiếp.

### Tests, configuration và documentation

- `package.json`: thêm `test:workflows`; không đổi dependency/version.
- `workflows-regression.test.ts`: regression lifecycle, outcomes, ATB, chat và Studio.
- `tests/combatScenarios.ts`: inputs, seeded RNG/time và injectable effect ports.
- `tests/fixtures/combat-outcomes-before-extraction.json`: 90 outcome baselines từ code trước lần tách này.
- `tests/fixtures/combat-turns-before-extraction.json`: 150 ATB baselines từ code trước lần tách này.
- `tests/fixtures/COMBAT_BASELINES.md`: provenance và giới hạn của fixtures.
- `docs/SERVER_CREDENTIALS_DESIGN.md`: ghi rõ hoãn triển khai.
- `docs/COMBAT_WORKFLOWS_REPORT.md`: báo cáo này.

Không di chuyển/xóa file cũ. Các implementation đã tách được bỏ khỏi caller tương ứng,
không để lại bản implementation song song. Không thay AI providers, public component
interfaces, persistence architecture hoặc game rules.

## Behavior compatibility và regression

115 workflow tests PASS:

- 90 outcome scenarios: 4 modes, victory/defeat/draw, rating theo turn và threat levels.
  So sánh trace effect, currency/EXP, inventory, loot, affection, campaign callbacks,
  result text, World Boss state và Phantasm HP. Dùng loot rolls thật, RNG/time cố định;
  log port tiêu thụ RNG như presentation callback.
- 150 ATB samples trong 1 test: threshold, ưu tiên tie, actor chết/vắng, overshoot,
  clock advance và không còn actor. Input không bị mutate.
- Admission trùng bị từ chối; run cũ không đổi lifecycle mới; fail không thành completed.
- Hủy khi đang chờ từng loại save ở cả 4 modes: không gọi effect phía sau checkpoint.
- Save rejection truyền lỗi một lần; outcome đã cancelled không tạo effect.
- Studio: success/provider error/deleted card/save error; bảo toàn metadata concurrent,
  cộng affection/variants và charge/refund/release theo thứ tự cũ.
- Chat: initial save failure, provider failure, reply save failure, error-message save
  failure; metadata concurrent, resonance cap, bounty attachment và history.
- Chat stale response/rejection hoặc unmount trong initial save không gọi AI/save tiếp.

Đã chạy:

| Command | Kết quả |
| --- | --- |
| `npm run lint` (`tsc --noEmit`) | PASS; repo không có ESLint riêng |
| `npm run build` | PASS; cảnh báo chunk >500 kB đã tồn tại |
| `npm run test:workflows` | 115/115 PASS |
| `npm run test:ai` | 38/38 PASS, mocked transport |
| `npm run test:architecture` | 8/8 PASS; không cycle/unresolved internal imports |
| `python phase1-regression.py` | 14 nhóm browser PASS |
| `python phase2-browser-regression.py` | 7 nhóm browser PASS |
| `python phase4-browser-regression.py` | 3 nhóm browser PASS |
| `python phase3-browser-smoke.py` | 14 tabs production render; cache navigation PASS |
| `git diff --check` | PASS |

Browser không ghi nhận page errors. Các flow gồm hydration/StrictMode, persistence,
transactions, Phantasm HP/victory/defeat/draw, World Boss saved state, combat failure và
unmount pending reward, chat stale response và Studio refund/concurrent metadata.
AI transport trong browser được mock; không coi đó là xác minh providers live.
Typechecking theo cấu hình hiện có của repo, không bật strict mode hoặc thay tooling.

## Regression risks và việc để sau

- Phần damage/status/weather/skills còn gắn animation và JSX log trong CombatView.
  Tách tiếp cần baseline cho chuỗi combat đầy đủ trước khi đổi boundary.
- Reward persistence vẫn theo thứ tự cũ, không atomic cho cả trận. Một save đã bắt đầu
  trước cancellation có thể hoàn tất; guard chỉ ngăn effect tiếp theo, không rollback.
- Golden scenarios xác minh các mẫu có kiểm soát, không chứng minh toàn bộ tổ hợp
  card/skill/weather/RNG hoặc gameplay cân bằng.
- Endpoint live và credentials/auth/quota không được triển khai hoặc test trong đợt này.
- Cảnh báo bundle lớn còn tồn tại; không mở rộng sang tối ưu bundle.
- Đồng bộ nhiều tab không nằm trong thay đổi này.

Dừng tại các cụm trên. Các cải tiến tiếp theo chỉ là đề xuất, không tự triển khai.
