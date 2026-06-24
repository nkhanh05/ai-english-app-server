// student.js
var express = require('express');
var router = express.Router();
const supabase = require('../db');

// ❌ ĐÃ RÀO LẠI: Không cho phép thiết bị di động gửi SQL Query trực tiếp lên DB.
/*
router.post('/query', async (req, res) => {
    res.status(403).send("Vì lý do bảo mật, truy vấn SQL thuần bị chặn.");
});
*/

router.post('/check/word/', async (req, res) => {
    try {
        const { term, definition } = req.body;
        const { data, error } = await supabase
            .from('Word')
            .select('*')
            .eq('term', term)
            .eq('definition', definition);

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy từ vựng này" });
        }

        res.status(200).json({ success: true, data: data[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Thêm từ vào thư viện user
router.post('/insert/user_word', async (req, res) => {
    try {
        const { userID, wordID, photoUrl } = req.body; 
        const { error } = await supabase
            .from('User_Word')
            .insert([{ userID, wordID, photoUrl }]);
            
        if (error) throw error;
        res.status(201).json({ message: "Insert success" });
    } catch (err) {
        res.status(500).send("Lỗi chèn dữ liệu: " + err.message);
    }
});

// Select từ vựng của user (JOIN bảng Word)
router.post('/select/user_word/:userID', async (req, res) => {
    try {
        const { userID } = req.params;
        const { data, error } = await supabase
            .from('User_Word')
            .select('*, Word!inner(term, definition)')
            .eq('userID', userID);

        if (error) throw error;

        // Trải phẳng object để trả về giống kết quả SQL JOIN
        const formatted = data.map(item => {
            const { Word, ...rest } = item;
            return { ...rest, term: Word.term, definition: Word.definition };
        });

        res.status(200).json(formatted); 
    } catch (err) {
        res.status(500).send("Lỗi truy vấn dữ liệu: " + err.message);
    }
});

// Lấy danh sách mọi người
router.post('/select/people', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Student')
            .select('totalExp, weeklyExp, streak, isStreakmaintained, User!inner(username, fullName, avatarUrl)')
            .order('fullName', { foreignTable: 'User', ascending: true });

        if (error) throw error;

        const formattedData = data.map(item => ({
            username: item.User.username,
            name: item.User.fullName,
            avatarUrl: item.User.avatarUrl,
            totalExp: item.totalExp,
            weeklyExp: item.weeklyExp,
            streak: item.streak,
            isStreakmaintained: item.isStreakmaintained
        }));

        res.status(200).json({ success: true, data: formattedData });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

module.exports = router;