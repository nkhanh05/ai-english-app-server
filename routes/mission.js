var express = require('express');
var router = express.Router();
const supabase = require('../db');

// Khai báo câu lệnh select chuẩn để lấy Bảng Cha + Tất cả các Bảng Con
const missionSelectQuery = '*, FriendMission(*), WordMission(*)';

// ==========================================
// DÀNH CHO STUDENT: XEM NHIỆM VỤ
// ==========================================

// Lấy các nhiệm vụ của một user
router.get('/student/:studentID', async (req, res) => {
    const { data, error } = await supabase
        .from('Student_Mission')
        .select(`Mission(${missionSelectQuery}), status, progress`)
        .eq('studentID', req.params.studentID);
        
    error ? res.status(400).json({ error: error.message }) : res.json(data);
});


// ==========================================
// DÀNH CHO ADMIN: QUẢN LÝ NHIỆM VỤ
// ==========================================

// 1. Thêm nhiệm vụ mới
router.post('/admin/add', async (req, res) => {
    try {
        const { missionName, description, type, adminID, startAt, endAt, friendRequire, wordRequire } = req.body;
        
        // Insert bảng cha
        const { data: missionData, error: missionError } = await supabase
            .from('Mission')
            .insert([{ missionName, description, type, AdminID: adminID, startAt, endAt }])
            .select('missionID')
            .single();

        if (missionError) throw missionError;
        const newMissionID = missionData.missionID;

        // Insert bảng con
        let childError = null;
        if (type === 'Friend') {
            const { error } = await supabase.from('FriendMission').insert([{ missionID: newMissionID, friendRequire }]);
            childError = error;
        } else if (type === 'Word') {
            const { error } = await supabase.from('WordMission').insert([{ missionID: newMissionID, wordRequire }]);
            childError = error;
        }

        if (childError) throw childError;

        res.status(201).json({ success: true, message: "Thêm nhiệm vụ thành công!", missionID: newMissionID });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 2. Lấy danh sách tất cả nhiệm vụ
router.get('/admin/select', async (req, res) => {
    const { data, error } = await supabase.from('Mission').select(missionSelectQuery);
    error ? res.status(400).json({ error: error.message }) : res.json(data);
});

// 3. Cập nhật nhiệm vụ
router.put('/admin/update/:id', async (req, res) => {
    try {
        const missionID = req.params.id;
        const { missionName, description, type, startAt, endAt, friendRequire, wordRequire } = req.body;

        // Cập nhật bảng cha
        const { error: parentError } = await supabase
            .from('Mission')
            .update({ missionName, description, type, startAt, endAt })
            .eq('missionID', missionID);

        if (parentError) throw parentError;

        // Cập nhật bảng con (Dùng upsert)
        let childError = null;
        if (type === 'Friend') {
            const { error } = await supabase.from('FriendMission').upsert({ missionID: missionID, friendRequire });
            childError = error;
        } else if (type === 'Word') {
            const { error } = await supabase.from('WordMission').upsert({ missionID: missionID, wordRequire });
            childError = error;
        }

        if (childError) throw childError;

        res.json({ success: true, message: "Cập nhật nhiệm vụ thành công!" });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 4. Xóa nhiệm vụ
router.delete('/admin/delete/:id', async (req, res) => {
    try {
        const missionID = req.params.id;

        // Xóa bảng con trước
        await Promise.all([
            supabase.from('FriendMission').delete().eq('missionID', missionID),
            supabase.from('WordMission').delete().eq('missionID', missionID),
            supabase.from('Student_Mission').delete().eq('missionID', missionID)
        ]);

        // Xóa bảng cha
        const { error } = await supabase.from('Mission').delete().eq('missionID', missionID);
        if (error) throw error;
        
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

module.exports = router;