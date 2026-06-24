

/* POST SIGN IN */
// user.js
var express = require('express');
var router = express.Router();
const supabase = require('../db');
const bcrypt = require('bcrypt'); // Khai báo thư viện bcrypt

const saltRounds = 10; // Thiết lập hệ số công việc (work factor)

/* POST SIGN IN (ĐĂNG NHẬP) */
router.post('/signin', async (req, res) => { 
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ username và password' });
    }

    // 1. Chỉ truy vấn bằng username để lấy mật khẩu băm từ DB về
    const { data, error } = await supabase
        .from('User')
        .select(`
            userID, username, password, fullName, role,
            Student (weeklyExp, totalExp, streak)
        `)
        .eq('username', username)
        .single(); 

    if (error || !data) {
        return res.status(401).json({ success: false, message: "Sai username hoặc password!" });
    }

    // 2. Dùng bcrypt để so sánh mật khẩu người dùng nhập với mã băm trong DB
    const isMatch = await bcrypt.compare(password, data.password);
    
    if (!isMatch) {
        return res.status(401).json({ success: false, message: "Sai username hoặc password!" });
    }

    // 3. Format lại dữ liệu và TUYỆT ĐỐI KHÔNG trả trường password về cho Frontend
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

/* POST SIGN UP (ĐĂNG KÝ) */
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

        // 2. Sinh chuỗi ngẫu nhiên (salt) và băm mật khẩu
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // 3. Insert User mới với mật khẩu ĐÃ BĂM (hashedPassword)
        const { data: newUser, error: insertError } = await supabase
            .from('User')
            .insert([{ username, password: hashedPassword, email, fullName, role: 'student' }])
            .select('userID')
            .single();

        if (insertError) throw insertError;

        // 4. Insert ID đó vào bảng Student
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