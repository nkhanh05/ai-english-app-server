var express = require('express');
var router = express.Router();
const { poolPromise, sql } = require('../db');

// Helper kiểm tra kết nối Database
const getPool = async () => {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database connection failed");
    return pool;
};

/* GET users listing. */
router.post('/signin', async (req, res) => { 
  try {
    const { username, password } = req.body;
    
    // 1. Kiểm tra xem client có gửi thiếu dữ liệu không
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ username và password' });
    }

    const pool = await poolPromise;
    
    // 2. Sử dụng LEFT JOIN để lấy thông tin base từ User và các chỉ số riêng từ Student
    const result = await pool.request()
        .input('username', sql.NVarChar(255), username)
        .input('password', sql.NVarChar(255), password)
        .query(`
            SELECT 
                u.userID, u.username, u.fullName, u.role,
                s.weeklyExp, s.totalExp, s.streak
            FROM [User] u
            LEFT JOIN [Student] s ON u.userID = s.studentID
            WHERE u.username = @username AND u.password = @password
        `); 

    // 3. Nếu không có dòng nào trả về -> Sai thông tin đăng nhập
    if (result.recordset.length === 0) {
        return res.status(401).json({ 
            success: false, 
            message: "Sai username hoặc password!" 
        });
    }

    // 4. Lấy dữ liệu và trả về
    const userData = result.recordset[0];
    res.json({ 
        success: true, 
        message: 'Đăng nhập thành công!', 
        user: userData 
    });

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

        const pool = await getPool();

        // Kiểm tra tồn tại
        const checkUser = await pool.request()
            .input('username', sql.NVarChar, username)
            .query('SELECT userID FROM [User] WHERE username = @username');

        if (checkUser.recordset.length > 0) {
            return res.status(409).json({ success: false, message: "Username đã tồn tại!" });
        }

        // Thực hiện Transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const request = new sql.Request(transaction);
            const insertUser = await request
                .input('username', sql.NVarChar, username)
                .input('password', sql.NVarChar, password)
                .input('email', sql.NVarChar, email)
                .input('fullName', sql.NVarChar, fullName)
                .input('role', sql.NVarChar, 'student')
                .query(`
                    INSERT INTO [User] (username, password, email, fullName, role)
                    VALUES (@username, @password, @email, @fullName, @role);
                    SELECT SCOPE_IDENTITY() AS userID;
                `);

            const newUserID = insertUser.recordset[0].userID;

            await request
                .input('uid', sql.Int, newUserID)
                .query('INSERT INTO [Student] (studentID) VALUES (@uid)');

            await transaction.commit();
            
            res.status(201).json({ success: true, message: 'Đăng ký thành công!', userID: newUserID });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (error) {
        console.error("Lỗi API Đăng ký:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }
});

module.exports = router;