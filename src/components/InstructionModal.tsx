import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const InstructionModal: React.FC<Props> = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md" 
                        onClick={onClose}
                    ></motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative z-10 w-full max-w-2xl bg-zinc-950 border border-cinematic-gold/30 rounded-2xl flex flex-col shadow-[0_0_50px_rgba(255,184,0,0.1)] max-h-[85vh] overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-gradient-to-r from-cinematic-gold/10 to-transparent">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-cinematic-gold/20 border border-cinematic-gold/40 flex items-center justify-center text-cinematic-gold">
                                    <i className="fa-solid fa-book-open text-xl"></i>
                                </div>
                                <div>
                                    <h3 className="text-xl font-serif text-white tracking-widest uppercase leading-none">HƯỚNG DẪN VẬN HÀNH</h3>
                                    <p className="text-[9px] text-zinc-500 font-mono tracking-widest mt-1">CINE-TECH PROTOCOL: USER_MANUAL_V1.5.4</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                                <i className="fa-solid fa-xmark"></i>
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 p-6 overflow-y-auto no-scrollbar space-y-8">
                            
                            {/* BƯỚC KHỞI ĐẦU - GAMEPLAY CƠ BẢN */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                                    <i className="fa-solid fa-gamepad text-cinematic-cyan/80"></i>
                                    <h4 className="text-sm font-bold text-white font-mono uppercase tracking-widest">HƯỚNG DẪN CƠ BẢN</h4>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                        <h5 className="text-[11px] font-bold text-cinematic-gold mb-1 font-mono uppercase"><i className="fa-solid fa-radar mr-1"></i> 1. Trích xuất (Extract)</h5>
                                        <p className="text-[10px] text-zinc-400 leading-relaxed">Sử dụng Data Credits (DC) để trích xuất Thẻ Nhân vật từ đa vũ trụ. Khởi đầu, bạn nên thu thập đủ thẻ phân khúc N, R để xây dựng đội hình cơ bản.</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                        <h5 className="text-[11px] font-bold text-cinematic-cyan mb-1 font-mono uppercase"><i className="fa-solid fa-dna mr-1"></i> 2. Thu dọn & Dung hợp</h5>
                                        <p className="text-[10px] text-zinc-400 leading-relaxed">Phân giải các thẻ không dùng ở mục Thẻ (Card Detail) để hoàn lại DC / Nguyên liệu. Ghép DNA 2 nhân vật ở tab Dung hợp (Fusion) để sinh thực thể cường hóa!</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                        <h5 className="text-[11px] font-bold text-red-400 mb-1 font-mono uppercase"><i className="fa-solid fa-crosshairs mr-1"></i> 3. Tác chiến (Combat)</h5>
                                        <p className="text-[10px] text-zinc-400 leading-relaxed">Triển khai Đội hình qua Giao thức Mạng. Chọn Mục tiêu (Boss) thích hợp, chiến thắng để thu về DC, EXP, Vé đặc quyền và Vật phẩm Rơi (Core/Shard).</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                        <h5 className="text-[11px] font-bold text-purple-400 mb-1 font-mono uppercase"><i className="fa-solid fa-shop mr-1"></i> 4. Ủy thác & Chợ Đen</h5>
                                        <p className="text-[10px] text-zinc-400 leading-relaxed">Cử Thẻ Bài đi Ủy thác (Expeditions) thu thập DC/Vật phẩm. Bán vật phẩm dư tại Chợ Đen hoặc dùng Quantum Dust Reroll Tộc/Hệ cho Đơn vị.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Ver 1.5.4 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-amber-400 to-orange-600 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 font-mono uppercase tracking-widest">Version 1.5.4: UI Pixel-Perfect Alignment</h4>
                                </div>
                                <div className="bg-cinematic-900/40 min-h-[50px] p-4 rounded-xl border border-amber-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Combat Layout Fix:</strong> Căn chỉnh tuyệt đối lại SQUAD_INTEGRITY trên các Breakpoint Mobile/Desktop để không bị lẹm viền.</p>
                                    <p><strong className="text-white">● Chimera UI Patch:</strong> Nội dung "XÚC TÁC" và "CÓ THỂ HIẾN TẾ THẺ" quy về cấu trúc 1 hàng (Inline), gia tăng điểm chạm vùng trung tâm.</p>
                                </div>
                            </section>

                            {/* Ver 1.5.3 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-green-400 to-green-600 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600 font-mono uppercase tracking-widest">Version 1.5.3: Adaptive UI/UX & Mobile Enhancement</h4>
                                </div>
                                <div className="bg-cinematic-900/40 min-h-[50px] p-4 rounded-xl border border-green-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Level Display (Header):</strong> Bố cục hiện thị Level được cải tiến giúp duy trì khả năng quan sát cấp độ liên tục trên mọi kích cỡ thiết bị.</p>
                                    <p><strong className="text-white">● Sector Scan Framework:</strong> Cấu trúc Radar lưới 3 cột (Grid), điều chỉnh hình dạng thon gọn trên một hàng với thiết bị màn hình nhỏ, gia tăng tính cơ động.</p>
                                </div>
                            </section>

                            {/* Ver 1.5.2 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-cinematic-cyan to-blue-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cinematic-cyan to-blue-500 font-mono uppercase tracking-widest">Version 1.5.2: Forge Protocol UX & Mobile Tuning</h4>
                                </div>
                                <div className="bg-cinematic-900/40 min-h-[50px] p-4 rounded-xl border border-cinematic-cyan/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Forge Tab Gộp Nhất:</strong> Gộp tính năng Chimera và UR Forge vào cùng một phân hệ (FORGE) để tối ưu không gian điều hướng.</p>
                                    <p><strong className="text-white">● Top-bar Mobile Adaptive:</strong> Thanh Header và System Tabs nay tự động dàn hàng thông minh (Wrap lines) và tối thiểu hóa khoảng trống, đảm bảo tất cả công cụ luôn khả dụng khi xoay dọc hay ngang điện thoại.</p>
                                </div>
                            </section>

                            {/* Ver 1.5.1 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-cinematic-cyan to-blue-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cinematic-cyan to-blue-500 font-mono uppercase tracking-widest">Version 1.5.1: Mobile UI/UX Optimization</h4>
                                </div>
                                <div className="bg-cinematic-900/40 min-h-[50px] p-4 rounded-xl border border-cinematic-cyan/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Tối ưu giao diện:</strong> Thanh điều hướng tự động giãn dòng trên thiết bị di động. Các màn hình chức năng (Đài trích xuất, Lò rèn UR, Chimera) được căn chỉnh tỷ lệ để phù hợp trên mọi kích thước màn hình 16:9 và 9:16.</p>
                                </div>
                            </section>

                            {/* Ver 1.5.0 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-yellow-400 to-red-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 font-mono uppercase tracking-widest">Version 1.5.0: Genesis Forge (Lò Khởi Nguyên)</h4>
                                </div>
                                <div className="bg-yellow-950/20 min-h-[50px] p-4 rounded-xl border border-yellow-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Hệ thống "Lò Rèn UR" (UR Forge):</strong> Thêm tab UR FORGE mới cho phép trực tiếp nâng cấp Thẻ SSR lên Hạng Tối Thượng (UR).</p>
                                    <p><strong className="text-white">● Vật Liệu Yêu Cầu:</strong> Cần 1 Thẻ SSR gốc (giữ lại Hệ/Tộc, thông tin cơ bản) và 2 Thẻ SSR hiến tế, kèm theo Quantum Dust và Data Credits phí duy trì Lò Rèn.</p>
                                    <p><strong className="text-white">● Cốt Truyện và Ảnh Tối Thượng:</strong> Quá trình nâng cấp thành công sẽ sử dụng AI để viết lại Cốt Truyện, Chiêu Cuối Huyền Thoại, cũng như Sinh ra Thẻ Bài với vẻ ngoài được Tiến Hóa Thần Thánh.</p>
                                </div>
                            </section>

                            {/* Ver 1.4.1 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-cyan-500 to-indigo-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500 font-mono uppercase tracking-widest">Version 1.4.1: Chuyên Biệt Hóa Gen</h4>
                                </div>
                                <div className="bg-cyan-950/20 min-h-[50px] p-4 rounded-xl border border-cyan-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Cơ chế Ép Tộc & Hệ Mới:</strong> Dung hợp Core/Shard trong tính năng Trích Xuất và Lai Tạo đã có thể ép trực tiếp hệ gene của thẻ đích.</p>
                                    <p><strong className="text-white">● Tăng cường Tính toán Biến Dị (% Cũ là Đột Biến):</strong> Tích lũy số lượng số vật phẩm ép Tộc tương ứng trực tiếp làm tăng Xác Suất Biến Dị.</p>
                                </div>
                            </section>

                            {/* Ver 1.4.0 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 font-mono uppercase tracking-widest">Version 1.4.0: Giao thức Lai tạo Mở rộng</h4>
                                </div>
                                <div className="bg-blue-950/20 min-h-[50px] p-4 rounded-xl border border-blue-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Cập nhật Hiển thị Tỉ lệ Lai tạo:</strong> Cung cấp cái nhìn trực quan, báo cáo rõ xác suất % sinh ra thẻ ở các phân bậc (Tier) tương ứng với tài nguyên hiến tế.</p>
                                    <p><strong className="text-white">● Cập nhật Kiểm soát Thuật toán Số lượng Xúc tác:</strong> Giao thức kiểm tra tự động khóa Xúc tác nếu Số lượng vật phẩm yêu cầu trong túi đã được đưa vào danh sách chi trả Phí Lai tạo gốc.</p>
                                    <p><strong className="text-white">● Hệ thống Hiến tế Thẻ (Đã được minh bạch hơn):</strong> Xúc tác từ Thẻ giúp tối ưu Tỉ lệ Đột biến và Nhận thẻ hạng cao, đồng thời hiển thị thông số trước khi thực thi nhằm dễ tiếp cận với toàn bộ player.</p>
                                </div>
                            </section>

                            {/* Ver 1.3.1 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-red-500 to-yellow-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500 font-mono uppercase tracking-widest">Version 1.3.1: Combat Impact Upgrade</h4>
                                </div>
                                <div className="bg-red-950/20 min-h-[50px] p-4 rounded-xl border border-red-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Hệ thống Nhịp Thở & Lơ Lửng:</strong> Phân cảnh chiến đấu được đẩy dần mô phỏng tự nhiên hơn với hơi thở của Boss.</p>
                                    <p><strong className="text-white">● Cơ chế Hit-Stop & Shatter:</strong> Đòn đánh chí mạng sẽ tạo ra độ trễ Hit-stop (dừng khung hình), và hiệu ứng Vỡ Gương (Glass Break) được kích hoạt khi Tiêu diệt Boss để tạo cảm giác uy lực.</p>
                                    <p><strong className="text-white">● Vòng Ma Pháp & Âm Nhạc:</strong> Vòng Âm dương và Nguyên tố kích hoạt dưới khu vực dàn trận hiển thị sắc màu từng Hệ cho Squad. Âm thanh Synth BGM và SFX chiến đấu đã được bổ sung nhằm tăng độ "nặng" cho đòn đánh.</p>
                                </div>
                            </section>

                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-purple-500 to-cyan-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-500 font-mono uppercase tracking-widest">Version 1.3.0: Thị trường Đen & Hoạt động Vệ tinh</h4>
                                </div>
                                <div className="bg-purple-950/20 min-h-[50px] p-4 rounded-xl border border-purple-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Cập nhật Đơn vị Vệ tinh (UNITS):</strong> Cổng Bounties cho phép game thủ theo dõi nhiệm vụ; Cổng Expeditions (Ủy thác) để triển khai đặc vụ tìm kiếm tài nguyên. Tab Storage tích hợp trong UNIT cho phép theo dõi Core và Shard.</p>
                                    <p><strong className="text-white">● Hệ thống Thị Trường Đen (MARKET):</strong> Giao dịch các vé trích xuất, mua bán Shard/Core để thu thập Quantum Dust. Hỗ trợ "Tái lập Cấu trúc Gen", cho phép sử dụng Dust & Vật phẩm tương ứng để Reroll (Hệ / Tộc) cho các Đơn vị Thẻ chưa hoàn hảo.</p>
                                    <p><strong className="text-white">● Quản lý Tài Nguyên:</strong> Hệ thống Boss nay sẽ rớt mảnh (Shard) dựa trên Nguyên Tố và lõi (Core) dựa trên Tộc Hệ. Thẻ bài có thể được khai thác sâu hơn và cá nhân hóa tốt hơn bằng cách ghép gen.</p>
                                </div>
                            </section>

                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-yellow-500 to-green-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-green-500 font-mono uppercase tracking-widest">Version 1.2.4: Phục hồi Auto API Proxy Nội Suy</h4>
                                </div>
                                <div className="bg-yellow-950/20 min-h-[50px] p-4 rounded-xl border border-yellow-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Cập nhật Trạng Thái:</strong> Đã khôi phục hoàn toàn ý tưởng gốc về API nội suy (Text / Image proxy của Pollinations theo dạng tự động - Auto API). Phục hồi khả năng hoạt động trên POST request, ổn định CORS, và khắc phục lỗi sập do Gemini Safety Settings cản trở kết nối khi dùng API Keys.</p>
                                </div>
                            </section>

                            {/* Ver 1.2.2 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-yellow-500 to-red-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 font-mono uppercase tracking-widest">Version 1.2.2: Hotfix API</h4>
                                </div>
                                <div className="bg-yellow-950/20 min-h-[50px] p-4 rounded-xl border border-yellow-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Hệ thống AI:</strong> Tắt bộ lọc chặn nội dung nhằm hạn chế lỗi khi AI từ chối tạo nhân vật (gây ra sự cố với các nhân vật bạo lực như Jinx). Tối ưu hệ thống dự phòng (Fallback) xuống Tier 2 ngay khi Gemini gặp lỗi bất kỳ.</p>
                                </div>
                            </section>

                            {/* Ver 1.2.1 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-red-500 to-orange-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 font-mono uppercase tracking-widest">Version 1.2.1: Boss Rebalance</h4>
                                </div>
                                <div className="bg-red-950/20 min-h-[50px] p-4 rounded-xl border border-red-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Cố Định Chỉ Số Boss:</strong> Cấp số nhân sức mạnh quá mức của Boss Ác Mộng đã được loại bỏ. Giờ đây Boss sẽ có khoảng chỉ số cố định theo độ khó, không còn scale dựa trên HP và sức mạnh của Đội Hình, tạo cơ hội cho các đội hình tối ưu có thể giành chiến thắng.</p>
                                </div>
                            </section>

                            {/* Ver 1.2.0 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-cinematic-cyan to-indigo-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cinematic-cyan to-indigo-500 font-mono uppercase tracking-widest">Version 1.2.0: Synergy Bonuses</h4>
                                </div>
                                <div className="bg-indigo-950/20 min-h-[50px] p-4 rounded-xl border border-indigo-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Đồng Lòng & Cộng Hưởng:</strong> Giờ đây Đội hình (Squad) sẽ nhận thêm các buff cực mạnh nếu bạn kết hợp đúng Hệ Nguyên Tố và Tộc Hệ. Buff này có thể giúp bạn dễ dàng vượt qua các Boss Ác Mộng (đặc biệt khi dùng đội hình UR).</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong className="text-cinematic-cyan">3 Thẻ Cùng Tộc Hệ:</strong> Đồng Lòng Thế Lực (+30% Tổng HP/ATK).</li>
                                        <li><strong className="text-cinematic-cyan">3 Thẻ Cùng Nguyên Tố:</strong> Cộng Hưởng Nguyên Tố (+30% Tổng ATK).</li>
                                        <li><strong className="text-cinematic-gold">3 Thẻ Khác Tộc Hệ (hoặc Nguyên tố):</strong> Đa Dạng Chiến Thuật/Nguyên Tố (+15% HP/ATK).</li>
                                        <li><strong className="text-zinc-300">2 Thẻ Cùng Tộc Hệ/Nguyên tố:</strong> Hỗ Trợ/Cộng Hưởng Nhẹ (+10% ATK).</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Ver 1.1.9 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-green-400 to-green-600 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-600 font-mono uppercase tracking-widest">Version 1.1.9: Extraction Overhaul</h4>
                                </div>
                                <div className="bg-green-950/20 min-h-[50px] p-4 rounded-xl border border-green-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Level Scaling (Cấp độ):</strong> Tỷ lệ Trích xuất giờ đây phụ thuộc trực tiếp vào Cấp độ (Level) của người chơi. Người chơi cấp cao sẽ có tỷ lệ mở thẻ SSR và UR lớn hơn so với người chơi cấp thấp.</p>
                                    <p><strong className="text-white">● Pity System (Điểm tích lũy):</strong> Bổ sung hệ thống Pity. Cứ mỗi lần Trích xuất không nhận được thẻ SSR/UR, Bộ đếm Pity sẽ tăng 1. Từ Pity 50 trở lên, tỷ lệ UR/SSR tăng mạnh (Rising). Tại Pity 90, chắc chắn 100% nhận thẻ UR hoặc SSR (Guaranteed).</p>
                                    <p><strong className="text-white">● Base Rate Adjustment:</strong> Tỷ lệ trích xuất cơ bản đã được điều chỉnh. Thẻ UR hiện tại cực kỳ hiếm ở những cấp độ đầu nếu bạn chưa tích lũy đủ Level hoặc Pity.</p>
                                </div>
                            </section>

                            {/* Ver 1.1.8 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-blue-400 to-cinematic-cyan rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cinematic-cyan font-mono uppercase tracking-widest">Version 1.1.8: Vault Protocol</h4>
                                </div>
                                <div className="bg-blue-950/20 min-h-[50px] p-4 rounded-xl border border-blue-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Bộ lọc Local Vault (Gallery):</strong> Bổ sung hệ thống sắp xếp và lưới lọc dữ liệu tiên tiến trong kho chứa. Giờ đây bạn có thể phân loại đội hình bằng cách sắp xếp theo Hạng, Cấp độ, hoặc truy xuất thẻ dựa trên Tộc Hệ, Nguyên tố dễ dàng.</p>
                                </div>
                            </section>

                            {/* Ver 1.1.7 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 font-mono uppercase tracking-widest">Version 1.1.7: Tactical Override</h4>
                                </div>
                                <div className="bg-orange-950/20 min-h-[50px] p-4 rounded-xl border border-orange-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Sự Can Thiệp Chiến Thuật (Tactical Override):</strong> Người chơi giờ đây không chỉ đóng vai trò xếp đội hình, mà trực tiếp can thiệp vào các diễn biến chiến trường qua 2 phím tắt vệ tinh:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong className="text-red-400">Orbital Strike (100 DC):</strong> Gọi vệ tinh oanh tạc, lập tức trừ 20% sinh lực tối đa của Boss.</li>
                                        <li><strong className="text-green-400">Emergency Repair (50 DC):</strong> Kích hoạt Nanobot cứu thương, hồi phục lập tức 30% sinh lực tối đa cho lực lượng tiền tuyến.</li>
                                    </ul>
                                </div>
                            </section>

                            {/* Ver 1.1.6 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-purple-400 to-cinematic-cyan rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cinematic-cyan font-mono uppercase tracking-widest">Version 1.1.6: Loot Drops & Leader Core</h4>
                                </div>
                                <div className="bg-purple-950/10 min-h-[50px] p-4 rounded-xl border border-purple-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Base/Elite Extract Tickets:</strong> Boss giờ đây có tỷ lệ đánh rơi <span className="text-cinematic-cyan font-bold">Vé Trích Xuất Tiêu Chuẩn</span> và <span className="text-purple-400 font-bold">Vé Đặc Quyền</span> phụ thuộc vào độ khó. Sử dụng Vé Đặc Quyền đảm bảo trích xuất tối thiểu thẻ hạng SR.</p>
                                    <p><strong className="text-white">● Leader Core (Chỉ Huy):</strong> Tại sảnh Squad (Ops), bạn có thể bổ nhiệm một thẻ nhân vật vào vị trí Chỉ Huy (Crown icon). Khi được triển khai, Chỉ Huy sẽ kích hoạt Leader Core buff, toàn bộ đội hình sẽ nhận thêm 15% Sinh lực và Sát thương cơ bản.</p>
                                </div>
                            </section>

                            {/* Ver 1.1.5 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600 font-mono uppercase tracking-widest">Version 1.1.5: Active Elements & Enrage</h4>
                                </div>
                                <div className="bg-red-950/10 min-h-[50px] p-4 rounded-xl border border-red-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Trạng Thái Nguyên Tố (Active Elemental Status):</strong> Nguyên tố giờ đây không chỉ là chỉ số khắc chế thụ động. Thẻ khi tấn công có tỷ lệ kích hoạt các hiệu ứng đặc ý (Thiêu Đốt, Tê Buốt, Hóa Đá, Bào Mòn, Tê Liệt) lên Boss, với tỷ lệ trực tiếp tăng theo cấp độ Ultimate (Lv.1 - Lv.10).</p>
                                    <p><strong className="text-white">● Boss Cuồng Nộ (Enrage Boss):</strong> Khi lượng máu của đối thủ chạm đáy (dưới 30%), Boss sẽ kích hoạt chế độ Cuồng Nộ sinh tồn, tăng sát thương cơ bản gấp rưỡi (x1.5). Trận chiến sẽ thử thách khả năng áp đảo dứt điểm của đội hình.</p>
                                </div>
                            </section>

                            {/* Ver 1.1.4 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-red-500 to-orange-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400 font-mono uppercase tracking-widest">Version 1.1.4: Threat Escalation</h4>
                                </div>
                                <div className="bg-red-900/10 min-h-[50px] p-4 rounded-xl border border-red-500/20 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Hệ Thống Tìm Kiếm Mới:</strong> Radar giờ cho phép quét nhiều khu vực nguy hiểm (<span className="text-cinematic-cyan font-bold">Cơ Bản</span>, <span className="text-purple-400 font-bold">Tinh Anh</span>, <span className="text-red-500 font-bold">Ác Mộng</span>). Đổi lấy rủi ro cao hơn, chỉ số Boss sẽ được khuếch đại (đến x4) và lượng DC thu về tăng đột biến.</p>
                                    <p><strong className="text-white">● Cập Nhật Combat:</strong> Kỹ năng Nội Tại (Passive) của Boss sẽ chính thức được kích hoạt và ghi nhận trên hệ thống. Đồng thời, cấp độ Ultimate của Thẻ (Lv.1 - Lv.10) trực tiếp gia tăng bội số sát thương Chí mạng, tạo nên khác biệt rạch ròi giữa N, R, SR, SSR và UR.</p>
                                </div>
                            </section>

                            {/* Ver 1.1.3 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-gradient-to-b from-purple-500 to-cinematic-cyan rounded-full"></div>
                                    <h4 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cinematic-cyan font-mono uppercase tracking-widest">Version 1.1.3: Origin & Awakening</h4>
                                </div>
                                <div className="bg-white/2 min-h-[50px] p-4 rounded-xl border border-white/5 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Awakening (Thức tỉnh):</strong> Giờ đây chỉ có các thẻ từ <span className="text-purple-400 font-bold">SR, SSR, UR</span> mới đủ tư chất kích hoạt <strong className="text-white">Passive Skill</strong> (Tuyệt kỹ nội tại). Thẻ hạng N và R đóng vai trò nền tảng dữ liệu.</p>
                                    <p><strong className="text-white">● Ultimate Scaling:</strong> Sức mạnh kỹ năng Tối thượng (Ultimate Move) chính thức được phân cấp độ <strong className="text-white">(Lv.1 - Lv.10)</strong> tùy thuộc trực tiếp vào phẩm chất gốc của thẻ.</p>
                                    <p><strong className="text-white">● Data Lineage (Nguồn gốc):</strong> Mọi bản thể đều được theo dõi tuyến tính. Hồ sơ thẻ sẽ ghi nhận rõ nguồn gốc là <span className="text-cinematic-gold">EXTRACTED</span> (Trích xuất nguyên bản) hoặc <span className="text-cinematic-cyan">FORGED</span> (Lai tạo nhân tạo).</p>
                                </div>
                            </section>

                            {/* Ver 1.1.2 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-cinematic-cyan rounded-full"></div>
                                    <h4 className="text-sm font-bold text-cinematic-cyan font-mono uppercase tracking-widest">Version 1.1.2: Tactical Arena Update</h4>
                                </div>
                                <div className="bg-white/2 min-h-[50px] p-4 rounded-xl border border-white/5 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Combat Arena:</strong> Khi nhấn 'Initiate Ops', hệ thống sẽ chuyển sang giao diện Arena chuyên biệt. Toàn bộ thông số Chiến báo sẽ được ẩn để tối ưu thị giác, chỉ hiển thị linh hồn của trận đấu qua các chỉ số sát thương nhảy trực tiếp trên mục tiêu.</p>
                                    <p><strong className="text-white">● Visual Damage:</strong> Sát thương được phân loại màu sắc: <span className="text-cinematic-cyan font-bold">Xanh (Chí mạng)</span>, <span className="text-orange-400 font-bold">Cam (Boss nhận ST)</span>, <span className="text-red-500 font-bold">Đỏ (Squad nhận ST)</span>.</p>
                                    <p><strong className="text-white">● Responsive Arena:</strong> Giao diện tự động căn chỉnh cho màn hình dọc (9:16) và ngang (16:9) để không bao giờ bị cắt thông tin quan trọng.</p>
                                </div>
                            </section>

                            {/* Ver 1.1.1 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-cinematic-gold rounded-full"></div>
                                    <h4 className="text-sm font-bold text-cinematic-gold font-mono uppercase tracking-widest">Version 1.1.1: Elemental Resonance</h4>
                                </div>
                                <div className="bg-white/2 min-h-[50px] p-4 rounded-xl border border-white/5 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Tương khắc Tộc hệ:</strong> Dòng cơ bản: <span className="text-blue-400">Tech</span> &gt; <span className="text-purple-400">Magic</span> &gt; <span className="text-red-400">Mutant</span> &gt; <span className="text-blue-400">Tech</span>. Dòng Thần Bí: <span className="text-yellow-300">Light</span> &lt;&gt; <span className="text-zinc-400">Dark</span> (Thiên Địch: Gây thêm 30% sát thương lên nhau). Hệ khắc chế luôn gây thêm 30% sát thương.</p>
                                    <p><strong className="text-white">● Ngôi sao Nguyên tố:</strong> Áp dụng các nguyên tố <span className="text-red-500">Fire</span>, <span className="text-blue-500">Water</span>, <span className="text-green-500">Nature</span>... để tạo ra lợi thế vượt trội hoặc bất lợi cực lớn trong chiến đấu thông qua bảng Tứ Nguyên Tố.</p>
                                </div>
                            </section>

                            {/* Ver 1.1.0 */}
                            <section className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-1 bg-zinc-500 rounded-full"></div>
                                    <h4 className="text-sm font-bold text-zinc-500 font-mono uppercase tracking-widest">Version 1.1.0: Core Mechanics</h4>
                                </div>
                                <div className="bg-white/2 min-h-[50px] p-4 rounded-xl border border-white/5 text-zinc-400 text-xs leading-relaxed space-y-2">
                                    <p><strong className="text-white">● Extract (Trích xuất):</strong> Sử dụng radar AI để tìm kiếm nhân vật từ đa vũ trụ. Tốn Data Credits (DC) để thực hiện.</p>
                                    <p><strong className="text-white">● Forge (Lai tạo):</strong> Kết hợp 2 thẻ nhân vật để tạo ra một bản thể mạnh mẽ hơn, thừa hưởng các đặc tính và hệ số chỉ số từ cả hai.</p>
                                    <p><strong className="text-white">● Data Credits (DC):</strong> Đơn vị tài nguyên quan trọng cho mọi hoạt động, nhận được từ việc đánh bại Boss hoặc phân giải thẻ cũ.</p>
                                </div>
                            </section>

                            <div className="p-4 rounded-xl bg-cinematic-gold/5 border border-cinematic-gold/20 text-[10px] text-zinc-500 font-mono italic text-center">
                                * Lưu ý: Trò chơi sử dụng công nghệ AI nội suy theo thời gian thực. Hãy kiểm tra cài đặt OVERRIDE để đảm bảo kết nối API ổn định.
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5 shrink-0 bg-black/40">
                            <button onClick={onClose} className="w-full bg-cinematic-gold text-black py-3 rounded-xl font-bold tracking-widest uppercase text-xs shadow-[0_0_20px_rgba(255,184,0,0.3)] hover:scale-[1.02] transition-transform active:scale-95">Đã rõ, Quay lại Chỉ huy sở</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
