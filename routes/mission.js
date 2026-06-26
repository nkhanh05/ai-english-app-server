const express = require('express');
const router = express.Router();
const supabase = require('../db');

// ==========================================
// 1. DÀNH CHO ADMIN
// ==========================================

// Lấy toàn bộ danh sách nhiệm vụ 
router.get('/admin/select', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Mission')
            .select(`
                *,
                FriendMission (friendRequire),
                WordMission (wordRequire)
            `);

        if (error) throw error;
        
        // Data format: [{ missionID, missionName, FriendMission: [{friendRequire: X}], ... }]
        res.status(200).json(data);
    } catch (error) {
        console.error("Lỗi lấy danh sách nhiệm vụ (Admin):", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// ==========================================
// 2. DÀNH CHO STUDENT
// ==========================================

// Lấy nhiệm vụ của học sinh kèm theo tiến độ
// Lấy nhiệm vụ của học sinh kèm theo tiến độ
router.get('/student/:studentID', async (req, res) => {
    // ÉP KIỂU SANG SỐ NGUYÊN
    const studentID = parseInt(req.params.studentID, 10);
    try {
        const { data, error } = await supabase
            .from('Student_Mission')
            // GHI TRỰC TIẾP TÊN BẢNG
            .select(`
                status,
                progress,
                Mission (
                    *,
                    FriendMission (friendRequire),
                    WordMission (wordRequire)
                )
            `)
            .eq('studentID', studentID);

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error("Lỗi lấy danh sách nhiệm vụ (Student):", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;