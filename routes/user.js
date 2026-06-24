// user.js
var express = require('express');
var router = express.Router();
const supabase = require('../db');

/* POST SIGN IN */
router.post('/signin', async (req, res) => { 
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ username và password' });
    }

    // Truy vấn User JOIN với Student bằng cú pháp inner/left join của Supabase
    const { data, error } = await supabase
        .from('User')
        .select(`
            userID, username, fullName, role,
            Student (weeklyExp, totalExp, streak)
        `)
        .eq('username', username)
        .eq('password', password)
        .single(); // Lấy duy nhất 1 record

    if (error || !data) {
        return res.status(401).json({ success: false, message: "Sai username hoặc password!" });
    }

    // Format lại dữ liệu cho giống với code cũ của bạn
    const userData = {
        userID: data.userID,
        username: data.username,
        fullName: data.fullName,
        role: data.role,
        weeklyExp: data.Student?.[0]?.weeklyExp || 0,
        totalExp: data.Student?.[0]?.totalExp || 0,
        streak: data.Student?.[0]?.streak || 0
    };

    res.json({ success: true, message: 'Đăng nhập thành công!', user: userData });

  } catch (error) {
    console.error("Lỗi API Đăng nhập:", error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống máy chủ' });
  }
});

/* POST SIGN UP */
router.post('/signup', async (req, res) => {
    try {
        const { username, password, email, fullName } = req.body;
        if (!username || !password || !email || !fullName) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin' });
        }

        // 1. Kiểm tra tồn tại
        const { data: existingUser } = await supabase
            .from('User')
            .select('userID')
            .eq('username', username);

        if (existingUser && existingUser.length > 0) {
            return res.status(409).json({ success: false, message: "Username đã tồn tại!" });
        }

        // 2. Insert User mới (Supabase trả về ID tự sinh)
        const { data: newUser, error: insertError } = await supabase
            .from('User')
            .insert([{ username, password, email, fullName, role: 'student' }])
            .select('userID')
            .single();

        if (insertError) throw insertError;

        // 3. Insert ID đó vào bảng Student
        const { error: studentError } = await supabase
            .from('Student')
            .insert([{ studentID: newUser.userID }]);

        // Rollback thủ công nếu insert Student bị lỗi
        if (studentError) {
            await supabase.from('User').delete().eq('userID', newUser.userID);
            throw studentError;
        }
        
        res.status(201).json({ success: true, message: 'Đăng ký thành công!', userID: newUser.userID });

    } catch (error) {
        console.error("Lỗi API Đăng ký:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }
});

module.exports = router;