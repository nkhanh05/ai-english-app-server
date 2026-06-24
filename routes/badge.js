var express = require('express');
var router = express.Router();
const supabase = require('../db');

// Khai báo câu lệnh select chuẩn để lấy Bảng Cha + Tất cả các Bảng Con
const badgeSelectQuery = '*, ExpBadge(*), FriendBadge(*), StreakBadge(*)';

// ==========================================
// DÀNH CHO ADMIN: QUẢN LÝ HUY HIỆU
// ==========================================

// 1. Thêm huy hiệu mới
router.post('/admin/add', async (req, res) => {
    try {
        const { badgeName, description, category, type, adminID, expRequire, friendRequire, streakCount } = req.body;
        
        // Insert vào bảng cha (Badge) trước
        const { data: badgeData, error: badgeError } = await supabase
            .from('Badge')
            .insert([{ badgeName, description, category, type, AdminID: adminID }])
            .select('badgeID')
            .single(); 

        if (badgeError) throw badgeError;
        const newBadgeID = badgeData.badgeID;

        // Insert tiếp vào bảng con tương ứng
        let childError = null;
        if (type === 'Exp' || category === 'Exp') {
            const { error } = await supabase.from('ExpBadge').insert([{ badgeID: newBadgeID, ExpRequire: expRequire }]);
            childError = error;
        } else if (type === 'Friend' || category === 'Friend') {
            const { error } = await supabase.from('FriendBadge').insert([{ badgeID: newBadgeID, friendRequire: friendRequire }]);
            childError = error;
        } else if (type === 'Streak' || category === 'Streak') {
            const { error } = await supabase.from('StreakBadge').insert([{ badgeID: newBadgeID, streakCount: streakCount }]);
            childError = error;
        }

        if (childError) throw childError;

        res.status(201).json({ success: true, message: "Thêm huy hiệu thành công!", badgeID: newBadgeID });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 2. Lấy danh sách tất cả huy hiệu
router.get('/admin/select', async (req, res) => {
    const { data, error } = await supabase.from('Badge').select(badgeSelectQuery);
    error ? res.status(400).json({ error: error.message }) : res.json(data);
});

// 3. Cập nhật huy hiệu
router.put('/admin/update/:id', async (req, res) => {
    try {
        const badgeID = req.params.id;
        const { badgeName, description, category, type, expRequire, friendRequire, streakCount } = req.body;

        // Cập nhật bảng cha
        const { error: parentError } = await supabase
            .from('Badge')
            .update({ badgeName, description, category, type })
            .eq('badgeID', badgeID);

        if (parentError) throw parentError;

        // Cập nhật bảng con (Dùng upsert)
        let childError = null;
        if (type === 'Exp' || category === 'Exp') {
            const { error } = await supabase.from('ExpBadge').upsert({ badgeID: badgeID, ExpRequire: expRequire });
            childError = error;
        } else if (type === 'Friend' || category === 'Friend') {
            const { error } = await supabase.from('FriendBadge').upsert({ badgeID: badgeID, friendRequire: friendRequire });
            childError = error;
        } else if (type === 'Streak' || category === 'Streak') {
            const { error } = await supabase.from('StreakBadge').upsert({ badgeID: badgeID, streakCount: streakCount });
            childError = error;
        }

        if (childError) throw childError;

        res.json({ success: true, message: "Cập nhật huy hiệu thành công!" });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 4. Xóa huy hiệu
router.delete('/admin/delete/:id', async (req, res) => {
    try {
        const badgeID = req.params.id;

        // Xóa bảng con trước để tránh lỗi Foreign Key
        await Promise.all([
            supabase.from('ExpBadge').delete().eq('badgeID', badgeID),
            supabase.from('FriendBadge').delete().eq('badgeID', badgeID),
            supabase.from('StreakBadge').delete().eq('badgeID', badgeID),
            supabase.from('Student_Badge').delete().eq('badgeID', badgeID) 
        ]);

        // Xóa bảng cha
        const { error } = await supabase.from('Badge').delete().eq('badgeID', badgeID);
        if (error) throw error;
        
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});


// ==========================================
// DÀNH CHO STUDENT: XEM HUY HIỆU
// ==========================================

// 1. Lấy các huy hiệu ĐÃ sở hữu
router.get('/student/:studentID/owned', async (req, res) => {
    const { data, error } = await supabase
        .from('Student_Badge')
        .select(`Badge(${badgeSelectQuery})`) 
        .eq('studentID', req.params.studentID);
    
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
});

// 2. Lấy các huy hiệu CHƯA sở hữu
router.get('/student/:studentID/unowned', async (req, res) => {
    try {
        const { studentID } = req.params;
        
        // Lấy ID các huy hiệu đã có
        const { data: ownedData, error: ownedError } = await supabase
            .from('Student_Badge')
            .select('badgeID')
            .eq('studentID', studentID);

        if (ownedError) throw ownedError;

        const ownedBadgeIds = ownedData.map(item => item.badgeID);

        // Lấy phần còn lại
        let query = supabase.from('Badge').select(badgeSelectQuery); 
        if (ownedBadgeIds.length > 0) {
            query = query.not('badgeID', 'in', `(${ownedBadgeIds.join(',')})`);
        }

        const { data: unownedBadges, error: unownedError } = await query;
        if (unownedError) throw unownedError;

        res.json(unownedBadges);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;