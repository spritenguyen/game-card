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
                                    <p className="text-[9px] text-zinc-500 font-mono tracking-widest mt-1">CINE-TECH PROTOCOL: USER_MANUAL_V1.1.9</p>
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
                                        <p className="text-[10px] text-zinc-400 leading-relaxed">Phân giải các thẻ không dùng ở mục Thẻ (Card Detail) để hoàn lại DC. Ghép DNA 2 nhân vật ở tab Dung hợp (Fusion) để sinh thực thể cường hóa!</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                        <h5 className="text-[11px] font-bold text-red-400 mb-1 font-mono uppercase"><i className="fa-solid fa-crosshairs mr-1"></i> 3. Tác chiến (Combat)</h5>
                                        <p className="text-[10px] text-zinc-400 leading-relaxed">Triển khai Đội hình qua Giao thức Mạng. Chọn Mục tiêu (Boss) thích hợp, chiến thắng để thu về DC, EXP và Vé đặc quyền.</p>
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                        <h5 className="text-[11px] font-bold text-purple-400 mb-1 font-mono uppercase"><i className="fa-solid fa-arrow-trend-up mr-1"></i> 4. Level & Trái Gọt</h5>
                                        <p className="text-[10px] text-zinc-400 leading-relaxed">Nhận EXP qua Tác chiến. Level càng cao, tỷ lệ trích xuất thẻ UR (vũ khí tối thượng) càng tăng tốc và dễ dàng chinh phục Ác mộng.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Ver 1.1.9 - Newest */}
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
                                    <p><strong className="text-white">● Tương khắc Tộc hệ:</strong> <span className="text-blue-400">Tech</span> &gt; <span className="text-purple-400">Magic</span> &gt; <span className="text-red-400">Mutant</span> &gt; <span className="text-blue-400">Tech</span>. Gây thêm 30% sát thương.</p>
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
