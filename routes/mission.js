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
router.get('/student/:studentID', async (req, res) => {
    const { studentID } = req.params;
    try {
        const { data, error } = await supabase
            .from('Student_Mission')
            .select(`
                status,
                progress,
                Mission:missionID (
                    *,
                    FriendMission (friendRequire),
                    WordMission (wordRequire)
                )
            `)
            .eq('studentID', studentID);

        if (error) throw error;

        // Data trả về sẽ có format:
        // [
        //   {
        //     "status": "unfinished",
        //     "progress": 0,
        //     "Mission": {
        //         "missionName": "...",
        //         "FriendMission": [...],
        //         "WordMission": []
        //     }
        //   }
        // ]
        // Định dạng này KHỚP HOÀN TOÀN VỚI Class `StudentMissionDetail.fromJson` bên Flutter của bạn!
        res.status(200).json(data);
    } catch (error) {
        console.error("Lỗi lấy danh sách nhiệm vụ (Student):", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;