# PHASE 4 — VALIDATION TOÀN HỆ THỐNG

## 1. Trạng thái tổng thể

**PASS WITH WARNINGS**.

Hai regression được tái hiện và sửa bằng patch nhỏ: parsing Gemini response có
`null` text part, và combat tiếp tục reward/progress/error callbacks sau unmount
khi đang chờ persistence. Không còn regression Critical/High đã biết chưa xử lý
trong các luồng được kiểm tra. Đây không phải tuyên bố mọi input hay provider live
đều đã được xác minh.

Build/typecheck, unit/integration suites và browser flows khả thi đã được kiểm tra.
Generation live chưa xác minh: không có Gemini test credential; proxy của môi trường
chặn Worker và Pollinations. Vite vẫn cảnh báo chunk lớn. Kiểm tra unused bổ sung
phát hiện tồn đọng không làm configured lint/build thất bại.

Phạm vi Phase 4 chỉ gồm hai patch runtime, regression tests và báo cáo này. Không
refactor thêm, không đổi provider/config/Worker contract, không update package versions,
không commit, deploy hoặc tạo PR. Working tree vẫn bao gồm Phase 1–3 trước đó.

## 2. Build / lint / typecheck

| Command / kiểm tra | Kết quả |
|---|---|
| `npm run lint` | PASS — script hiện có là `tsc --noEmit` |
| `./node_modules/.bin/tsc --noEmit` | PASS — typecheck riêng cũng đã chạy |
| `npm run build` | PASS — Vite production build; cảnh báo chunk >500 kB còn tồn tại |
| `GEMINI_API_KEY=phase4-bundle-test-sentinel npm run build` | PASS — giá trị giả để kiểm tra secret injection |
| Scan toàn bộ `dist` tìm sentinel | PASS — sentinel không xuất hiện trong bundle |
| `npm run test:architecture` | PASS — runtime graph, import resolution và domain boundaries |
| `git diff --check` | PASS |
| `tsc --noEmit --noUnusedLocals --noUnusedParameters` | FAIL — 67 unused diagnostics; kiểm tra bổ sung, không phải cấu hình lint của repo |

Không có ESLint command trong repo. Không gọi một kiểm tra unused thất bại là lint
pass: configured lint/typecheck pass; supplemental unused check fail được ghi riêng.
Các diagnostics gồm imports, locals, destructured props và parameters không dùng.
Không xóa hàng loạt code vốn có chỉ để bật một compiler policy mới trong Phase 4.

TypeScript/build không phát hiện syntax errors, unresolved imports, ambiguous/duplicate
exports gây compile failure hoặc invalid config references. Các explicit compatibility
re-exports của stats override exports domain là chủ ý, không phải duplicate service.

Import scan trên 77 source files, gồm dynamic imports, cho thấy không có vòng runtime.
Domain không import React, browser storage, HTTP hay AI providers. Type-only repository
port dependencies được phân biệt với runtime dependencies.

Giới hạn: `@types/react` và `@types/react-dom` hiện không được cài; cấu hình TypeScript
không strict. Typecheck pass không đồng nghĩa JSX props/hook contracts đã được kiểm
tra đầy đủ. Đây là hạn chế sẵn có, chưa thay compiler policy/dependencies để mở rộng
scope trong Phase 4.

## 3. Test

| Command | Kết quả cuối |
|---|---|
| `npm run test:ai` | 38 tests PASS, 0 fail |
| `npm run test:architecture` | 8 tests PASS, 0 fail |
| `python phase1-regression.py` | 14 nhóm PASS, không page error |
| `python phase2-browser-regression.py` | 7 nhóm PASS, không page error |
| `python phase3-browser-smoke.py` | 14 tab render PASS, lazy/cached navigation, không page error |
| `python phase4-browser-regression.py` | 3 nhóm PASS, không page error |

Hai Gemini tests mới và lifecycle test đã FAIL trước patch đúng với lỗi cần tái hiện,
sau đó PASS. Browser Phase 4 kiểm tra cả resolve và reject của persistence đang pending
sau unmount, không chỉ cancellation trong combat simulation.

Các suite có mock provider transport chặn request bên ngoài. Browser tests chạy Chromium,
React thực và IndexedDB thực trong browser context riêng; không sửa save của người dùng.
Dev server đã được khởi động lại khi process cũ ngừng chạy; đây là điều kiện môi trường,
không phải lỗi application. Test harness setup failures đã được sửa trước khi xác nhận
kết quả application; không tính các lỗi harness là regression của repo.

Các test live không chạy được đầy đủ:

- Gemini generation: không có `GEMINI_API_KEY` hoặc `GOOGLE_API_KEY` khả dụng; chỉ kiểm
  tra tên/presence của biến, không đọc/in secret ra output.
- Pollinations và Worker: đã thử POST thật; lỗi transport `Tunnel connection failed:
  403 Forbidden`. Request chưa đến provider nên không kết luận provider trả HTTP 403.

Không dùng mock results để tuyên bố provider deployment hoạt động live.

## 4. Application flows

Đã kiểm tra startup production, đủ 14 tab, first-use lazy loading và cached revisit.
Entry JS được tải lúc startup; 13 view chunks được tải khi navigation cần đến.

State/persistence:

- StrictMode hydration, malformed saved progress, zero currency balance.
- Card CRUD đồng bộ cards/squad/fusion/leader references.
- Fusion/upgrade transaction rollback và missing consumed card rejection.
- Implant/gear equip, swap, unequip và duplicate transaction rejection.
- Reset toàn bộ state; reset/save failure giữ dữ liệu và release processing lock.
- Remount khôi phục cards, squad, currency, inventory, skills, language/art style,
  runtime test key và các legacy config fields.
- Legacy DB exports và composition root dùng đúng cùng một repository singleton.

Game/UI:

- Extraction confirmation/cancel/save, crafting failures không trừ nguyên liệu.
- Splicing và reroll failure/refund, đúng dust cost.
- Phantasm win/defeat, action-limit draw, malformed World Boss save và reset date.
- Combat error/unmount release processing; pending reward persistence không tiếp tục
  reward/progress hoặc mở error dialog sau unmount.
- Chat giữ original localized fields/concurrent metadata; đóng FullCard chặn late AI save.
- Studio image success giữ concurrent card updates; failure refund dust và release lock.
- Lore/dialog HTML sanitization giữ định dạng được hỗ trợ.

Không xác minh mọi nhánh simulation/combat, resource interleaving nhiều tab hay stale
asset deployment. Không redesign UI hoặc thay các behavior cũ để cải thiện UX.

## 5. AI Text

| Case | Xác minh qua provider adapter → service → caller |
|---|---|
| A — Gemini thành công | REST method/header/body/schema; text parts được normalize, JSON schema/type được validate; game façade và UI nhận kết quả |
| B — Gemini lỗi | Network/provider failure và HTTP 401/403/404/408/429/5xx → Pollinations không key; không forward Gemini credentials/model |
| C — Gemini timeout | Abort và deadline → fallback; gồm transport bỏ qua abort và response body không resolve |
| D — Cả hai lỗi | `AiError` controlled, bounded attempts; không infinite retry; caller/UI xử lý lỗi |

Validation cũng bao gồm malformed envelopes/JSON/types, invalid key HTTP 400,
HTTP 400 input rejection không fallback, safety block/cancellation không fallback,
missing key, plain text và inline-image inference.

Regression đã sửa: `parts: [null, 42]` trước đây ném TypeError; hiện không có valid text
sẽ tạo provider `RESPONSE` failure và fallback. Mixed malformed parts + valid text giữ
valid primary response, không tạo fallback không cần thiết.

Pollinations vision không được giả lập như đã hỗ trợ: adapter free không hỗ trợ inline
image; Gemini vision failure trả controlled error. Chưa xác minh model/quota/live
availability của Gemini hoặc endpoint Pollinations trong môi trường này.

## 6. AI Image

Endpoint: `https://flat-bush-389f.spritenguyen.workers.dev/`.

Contract được kiểm tra theo đúng Worker source người dùng cung cấp:

- POST với `Content-Type: application/json`, body `{prompt,width,height,seed?}`.
- Không model override, credentials hoặc Worker GET `/image/{prompt}` cũ.
- Thành công: `image/png` binary → kiểm tra PNG signature → data URL → layer gọi/UI.
- HTTP 400/405/429/500: controlled error, không forward internal detail vào UI.
- Wrong MIME, invalid PNG, interrupted body và timeout: controlled error.
- Failed image không cache; dedup/cache key phân biệt prompt/dimensions; bypass hỗ trợ rerender.
- Image generation không gọi text service; Worker failure không chuyển sang provider khác.

Đã thử POST live với prompt đơn giản, width/height 1024 và seed 1. Proxy từ chối tunnel
trước khi request đến Worker. Không sửa adapter contract hoặc model/dimensions dựa trên
lỗi môi trường. CORS, quota, dimension limits và latency thực tế chưa được xác minh live.

## 7. Regression đã phát hiện

### R1 — Medium — Gemini malformed part gây TypeError và bỏ qua fallback — ĐÃ SỬA

- Nguồn: REST response parsing được đưa vào Phase 2.
- Tái hiện: HTTP 200, candidate content có `parts: [null, 42]` hoặc mixed null/valid text.
- Trước patch: đọc `part.thought` trên null gây TypeError; service coi đó là application
  error nên không fallback, phá controlled provider-error contract.
- Patch tối thiểu: guard part tồn tại và có type object trước khi đọc text/thought.
- File: `src/services/ai/text/geminiProvider.ts`; thêm 2 tests trong `ai-regression.test.ts`.
- Không đổi policy timeout/fallback, schema, endpoint hoặc public interface.

### R2 — High — Combat tiếp tục commit callbacks sau unmount khi chờ save — ĐÃ SỬA

- Nguồn: awaited reward persistence thêm ở Phase 1 nhưng thiếu checkpoint cancellation
  sau các await; guard trước reward phase không đủ bảo vệ lifecycle này.
- Tái hiện: auto-start Phantasm win → giữ addImplant promise pending → unmount → resolve.
  Trước patch vẫn gọi addGear và onPhantasmWin. Reject promise còn mở error dialog muộn.
- Patch tối thiểu: 10 cancellation checkpoints sau awaited implant/gear/card saves trong
  các reward branches; catch bỏ qua error UI callback khi battle đã cancelled.
- File: `src/views/CombatView.tsx`; regression trong `phase4-browser-regression.py`.
- Không đổi drop probabilities, stats, currency/reward formula hoặc mounted error handling.
- Save đã bắt đầu trước cancellation không được rollback hồi tố; guard chặn các callbacks
  tiếp theo. Không tuyên bố reward/resource commit đã trở thành một transaction tổng thể.

Files thay đổi trong Phase 4: hai implementation trên, `ai-regression.test.ts`,
`phase4-browser-regression.py` mới và báo cáo này.

## 8. File cleanup

Không xóa thêm dependency hoặc public compatibility file trong Phase 4. Audit không
phát hiện direct manifest dependency nào không có source/tooling usage cần loại bỏ.
`express`, `dotenv`, `@types/express` và `@google/genai` đã được loại bỏ ở phase trước;
không còn production import/reference, không update phiên bản package.

Năm file không có production incoming import được xác định rõ là compatibility modules:
`lib/constants.ts`, `lib/db.ts`, `lib/gameLogic.ts`, `lib/skills.ts`, `services/ai.ts`.
Tests hoặc integrations ngoài repo có thể dùng chúng; không coi là orphan implementation
để tự xóa. `base64ToBlob` giữ trong compatibility module, hiện không có production caller.

Không còn old provider implementation, direct UI provider HTTP calls, proxy Worker cũ,
Pollinations image endpoint hoặc Gemini key injection trong source production. Text
endpoint `text.pollinations.ai/openai` là fallback hiện tại, không phải endpoint bỏ sót.

Legacy fields `useCustomGemini`, `pollinationsKey`, `defaultImageModel` và cooldown metadata
được giữ tương thích save/monitor; không dùng để chọn provider mới. Các dead imports/locals
vốn có nằm trong 67 supplemental diagnostics, chưa cleanup hàng loạt ngoài scope.

## 9. Vấn đề còn lại

| Mức | Vấn đề và trạng thái |
|---|---|
| Critical | Không có regression đã biết chưa xử lý trong phạm vi đã kiểm tra |
| High | R2 đã sửa; không còn regression High đã biết chưa xử lý |
| Medium | Live provider validation bị giới hạn bởi proxy và missing Gemini credential; availability/quota/CORS chưa xác minh |
| Medium | Typecheck JSX/React contracts hạn chế vì thiếu React type declarations và cấu hình không strict; tồn tại trước phase này |
| Medium | Save nhiều tab/resource commits qua IndexedDB và localStorage chưa có atomic conflict policy; vấn đề kiến trúc đã ghi ở Phase 3, không thay trong Phase 4 |
| Low | Vite chunk >500 kB do dynamic icon registry; giữ cảnh báo, không nâng ngưỡng |
| Low | 67 unused diagnostics bổ sung, legacy config fields và compatibility helper chưa có production caller |

Credentials vẫn theo flow client-side hiện tại. Không thêm secret vào source/bundle.
Chưa xây backend credential proxy hoặc đồng bộ save nhiều tab.

## 10. Đề xuất bước tiếp theo — chỉ đề xuất

1. Chạy smoke live từ môi trường truy cập được hai endpoint và có Gemini test credential
   được cung cấp qua secure configuration; kiểm tra quota, CORS và dimension limits.
2. Tách một việc riêng để bổ sung React type declarations và typecheck JSX contracts;
   không gộp compiler-policy migration vào validation hiện tại.
3. Lập contract deployment/auth/quota trước khi chuyển credentials phía server.
4. Thiết kế save version/conflict/atomic resource policy trước khi đồng bộ nhiều tab.
5. Xử lý icon registry và unused cleanup trong task riêng, giữ behavior và import compatibility.

Phase 4 dừng sau validation và hai patch có bằng chứng; không tiếp tục refactor.
