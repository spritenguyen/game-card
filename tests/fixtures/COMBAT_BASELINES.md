# Combat baseline provenance

Các fixtures combat được capture từ CombatView ngay trước lần refactor use cases này,
sau các thay đổi Phase 1–4 đã có trong workspace. Đây không phải baseline từ git main.
SHA-256 của source đã dùng:
`e5c2b21ec1d950bc33cdc91f058fa856643e8df1581b84f32dd91a4040077fa8`.

- Outcomes: thực thi nguyên reward block gốc qua TypeScript transpilation, các effect
  được ghi vào trace. RNG lặp `[0.04,0.8,0.3,0.6,0.12,0.95,0.4]`, Date.now cố định
  `1700000000000`. Dùng rollImplant/rollGear thật; addLog tiêu thụ một lượt RNG để mô
  phỏng key của callback presentation gốc. 90 trường hợp, inputs tại combatScenarios.ts.
- ATB: thực thi nguyên actor-selection/clock block gốc, thay display/delay bằng kết
  quả transition. 150 inputs xác định với seed 417 (LCG 1664525/1013904223), gồm tie,
  threshold, slots chết/vắng, ready actors và clock advances.

Không regenerate fixtures từ implementation mới để làm test pass. Khi game rules
được thay đổi có chủ đích, review riêng expected differences trước khi cập nhật.
Fixtures không thay thế kiểm tra animation thực tế hoặc mọi tổ hợp game rules.
