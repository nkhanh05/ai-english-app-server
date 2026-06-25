// student.js
var express = require('express');
var router = express.Router();
const supabase = require('../db');

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

// ====================================================================
// 1. GET: LẤY GLOBAL RANKING
// ====================================================================
router.get('/allPeople', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Student')
            .select('studentID, totalExp, weeklyExp, streak, isStreakmaintained, User!inner(username, fullName, avatarUrl)')
            .order('totalExp', { ascending: false });

        if (error) throw error;

        const formattedData = data.map(item => ({
            studentID: item.studentID,
            username: item.User.username,
            fullName: item.User.fullName,
            avatarUrl: item.User.avatarUrl,
            totalExp: item.totalExp,
            weeklyExp: item.weeklyExp,
            streak: item.streak,
            isStreakmaintained: item.isStreakmaintained
        }));

        res.status(200).json(formattedData); 
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// ====================================================================
// 4. GET: TÌM KIẾM THEO USERNAME
// ====================================================================
router.get('/search', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập username' });
        }
  
        const { data, error } = await supabase
            .from('User')
            .select(`
                userID, username, fullName, role, avatarUrl,
                Student (weeklyExp, totalExp, streak)
            `)
            .eq('username', username)
            .single(); 
  
        if (error || !data) {
            return res.status(404).json({ success: false, message: 'Không tìm được người dùng' });
        }
  
        const userData = {
            userID: data.userID,
            username: data.username,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl,
            weeklyExp: data.Student?.[0]?.weeklyExp || 0,
            totalExp: data.Student?.[0]?.totalExp || 0,
            streak: data.Student?.[0]?.streak || 0
        };
  
        res.json({ success: true, user: userData });
  
    } catch (error) {
        console.error("Lỗi API Tìm kiếm:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }
});

// ====================================================================
// 2. GET: LẤY THÔNG TIN CHUẨN CỦA 1 PROFILE
// ====================================================================
router.get('/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { data, error } = await supabase
            .from('Student')
            .select('*, User!inner(username, fullName, avatarUrl, status)')
            .eq('studentID', studentId)
            .single();

        if (error || !data) return res.status(404).json({ success: false, message: "Không tìm thấy User" });

        const profileData = {
            studentID: data.studentID,
            weeklyExp: data.weeklyExp,
            totalExp: data.totalExp,
            streak: data.streak,
            isStreakmaintained: data.isStreakmaintained,
            username: data.User.username,
            fullName: data.User.fullName,
            avatarUrl: data.User.avatarUrl,
            status: data.User.status
        };

        res.status(200).json(profileData);
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
});

// ====================================================================
// 3. PUT: CẬP NHẬT PROFILE
// ====================================================================
router.put('/update/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { fullName, avatarUrl, status } = req.body; 

        // Cập nhật bảng User (vì fullName, avatarUrl nằm ở bảng User)
        const { error } = await supabase
            .from('User')
            .update({ fullName, avatarUrl, status })
            .eq('userID', studentId);

        if (error) throw error;

        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
});



module.exports = router;
