# Server credentials, authentication và quota

## Trạng thái: HOÃN TRIỂN KHAI

Theo yêu cầu người dùng, backend credentials/auth/quota được ghi nhận để làm sau
trong khi ứng dụng đang được test. Không thay đổi cơ chế credentials hiện tại.
Tài liệu dưới đây chỉ là đề xuất; chưa có backend hoặc authentication được triển khai.

## Hiện trạng đã xác minh

Ứng dụng React/Vite hiện không có server entry point, hệ thống account hay deployment
configuration. Gemini key được nhập trong Settings và lưu cùng `cineApiConfig` ở
localStorage. Gemini/Pollinations/Worker được gọi qua subsystem AI của Phase 2.

Không thể chuyển key vào một biến `VITE_*`: biến đó vẫn đi vào browser bundle.
Backend phải nhận request từ client và tự gắn credentials khi gọi provider.

## Data flow đề xuất

Browser → same-origin `/api/ai/*` → authentication → request validation → quota
reservation → AI services hiện có → normalized response → browser.

Gemini → Pollinations fallback vẫn được quyết định tại text service. Chuyển orchestration
này sang backend sẽ tránh việc browser tự gọi provider hoặc bypass quota của gateway.
Image đi qua endpoint riêng, tiếp tục đúng contract Worker POST JSON → PNG hiện tại.
Không rewrite game rules hoặc các prompts.

## API contract

- `GET /api/session`: trả authenticated status và thông tin quota không chứa secrets.
- `POST /api/session`: login; body phụ thuộc phương án authentication đã chọn.
- `DELETE /api/session`: revoke session và clear cookie.
- `POST /api/ai/text`: `{request: TextRequest, model?: string, structured: boolean}`.
  Server dùng allowlist model đã có; không nhận API key/URL/provider tùy ý từ client.
- `POST /api/ai/image`: `{prompt,width,height,seed?}`; trả PNG binary hoặc controlled error.

Thất bại trả envelope có code/message; không trả upstream headers, credentials hoặc
provider error detail. Auth/quota errors không kích hoạt Pollinations fallback.

## Authentication cần chốt

1. Một chủ app: đăng nhập bằng mật khẩu cấu hình phía server; principal cố định, quota
   chung cho account. Không giả vờ quota theo user khi dùng shared password.
2. Nhiều người dùng: account riêng; quota theo immutable user ID. Cần quyết định dùng
   account cấp sẵn hoặc identity provider hiện có; không tự thêm registration workflow.
3. Đã có auth: xác minh token/session của hệ thống hiện tại, không tạo hệ thống login thứ hai.

Session nên dùng cookie HttpOnly, Secure trong production và SameSite; kiểm tra Origin/CSRF
cho POST/DELETE. Không lưu session token hay server API key trong localStorage.
Login phải có TTL, revocation và rate limit trước password verification/provider calls.

## Quota contract đề xuất

Tách text/image theo principal đã xác thực, thêm global cap và concurrency cap.
Reservation phải atomic và xảy ra trước upstream request. Primary + fallback là một
logical text request; fallback không trừ quota lần thứ hai. Không infinite retry.

Cấu hình bắt buộc gồm daily text/image limits, global limits, concurrent requests,
body size, prompt/schema complexity, allowed models/dimensions và provider timeout.
Giới hạn là số request, không phải cam kết chi phí/token billing.

Quota/session phải tồn tại qua restart. Node single-instance có thể dùng SQLite trên
persistent volume; multi-instance cần shared transactional storage. Không dùng Map
trong RAM rồi tuyên bố có daily quota bền vững. Không tự chọn mức quota/cost budget
production khi chưa có chính sách vận hành.

## Configuration và migration

- `GEMINI_API_KEY` chỉ ở server environment/secret manager.
- Không gửi key trong response, URL, log, frontend config hoặc source control.
- Client Settings bỏ ô API key; giữ model/art/language như hiện tại.
- Migration xóa `geminiKey` và `pollinationsKey` đã lưu khi client chuyển sang backend;
  không chỉ bỏ qua field rồi để secret tồn tại trong browser storage.
- Development dùng Vite proxy `/api`; production dùng same-origin backend/reverse proxy.
- Backend sử dụng lại provider/service abstraction hiện có; không đổi provider.

Worker image hiện công khai, không yêu cầu auth. Gateway quota chỉ bảo vệ request qua
ứng dụng. Muốn bảo vệ toàn endpoint Worker cần bổ sung xác thực ở Worker deployment;
không thể đạt điều đó chỉ bằng sửa React hoặc proxy. Contract Worker không được tự đổi.

## Validation cần chạy khi implement

Unauthenticated/expired/revoked session bị chặn trước upstream; CSRF/foreign Origin bị
chặn; auth/quota không fallback; concurrent quota reservation không vượt cap; counters
và sessions tồn tại sau restart; key không có trong dist, requests client hoặc errors.

Gemini success/failure/timeout → đúng primary/fallback; cả hai failure → controlled error.
Worker success/invalid response/HTTP failure/timeout → controlled result. Regression
game/persistence/navigation giữ nguyên ngoài flow login cần thiết.

## Quyết định còn thiếu

Audience/authentication và hosting/identity provider hiện có. Đây là thông tin để chốt
implementation, không phải yêu cầu cấp permission hoặc gửi secret vào chat.

Tài liệu này là thiết kế đề xuất; chưa có backend được implement/deploy và chưa đổi
credential flow hiện tại.
