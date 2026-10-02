/** Existing daily pools, shuffle, counts and timestamp IDs are preserved. */
export const generateQuests = () => {
    const pool = [
        { type: 'extract', title: 'Triệu hồi Thẻ', description: 'Thực hiện 1 lần Extract', targetCount: 1, rewardDC: 50, rewardTickets: [] },
        { type: 'extract', title: 'Chuyên gia Triệu hồi', description: 'Thực hiện 3 lần Extract', targetCount: 3, rewardDC: 150, rewardTickets: [{type: 'base', amount: 1}] },
        { type: 'boss', title: 'Săn Tiền Thưởng', description: 'Đánh bại 3 Boss bất kỳ', targetCount: 3, rewardDC: 100, rewardTickets: [{type: 'elite', amount: 1}] },
        { type: 'fusion', title: 'Nghiên cứu Lai tạo', description: 'Tiến hành Fusion 1 lần', targetCount: 1, rewardDC: 100, rewardTickets: [] },
        { type: 'combat', title: 'Chiến Binh', description: 'Tham gia 5 trận chiến', targetCount: 5, rewardDC: 150, rewardTickets: [] },
        { type: 'upgrade', title: 'Cường hóa Thẻ', description: 'Nâng cấp 1 thẻ', targetCount: 1, rewardDC: 50, rewardTickets: [] },
        { type: 'sell', title: 'Phân tách', description: 'Bán 2 thẻ không dùng', targetCount: 2, rewardDC: 80, rewardTickets: [] }
    ];
    // Shuffle and pick 4
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4).map((q, i) => ({
        id: `q_daily_${Date.now()}_${i}`,
        ...q,
        currentCount: 0,
        isCompleted: false,
        isClaimed: false
    }));
};

export const generateExpeditions = () => {
    const pool = [
        { name: 'Thăm dò tàn tích Lửa', description: 'Khám phá tàn tích hệ Fire', durationMinutes: 30, requiredElement: 'Fire', rewardDC: 200, rewardMaterials: [{item: 'Tech Core', amount: 3}] },
        { name: 'Nghiên cứu công nghệ Mutant', description: 'Tìm hiểu tại khu vực Mutant', durationMinutes: 60, requiredFaction: 'Mutant', rewardDC: 400, rewardMaterials: [{item: 'Mutant Core', amount: 1}] },
        { name: 'Khám phá Không Gian', description: 'Lập bản đồ vùng Ethereal', durationMinutes: 120, requiredFaction: 'Ethereal', rewardDC: 800, rewardMaterials: [{item: 'Magic Core', amount: 2}] },
        { name: 'Rà soát bóng tối', description: 'Tiêu diệt dị biến VoidBringer', durationMinutes: 45, requiredFaction: 'VoidBringer', rewardDC: 300, rewardMaterials: [{item: 'Dark Core', amount: 1}] },
        { name: 'Thu thập Thủy Tinh', description: 'Lặn sâu vào tàn tích Water', durationMinutes: 30, requiredElement: 'Water', rewardDC: 200, rewardMaterials: [{item: 'Light Core', amount: 2}] }
    ];
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map((e, i) => ({
        id: `e_daily_${Date.now()}_${i}`,
        ...e,
        status: 'idle'
    }));
};

