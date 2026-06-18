var express = require('express');
var router = express.Router();

/* GET users listing. */
router.post('/signin', async (req, res) => { 
  try {
    const { username, password } = req.body;
    
    // Kiểm tra xem client có gửi thiếu dữ liệu không
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ username và password' });
    }

    const pool = await poolPromise;
    const result = await pool.request()
        .input('username', sql.NVarChar(255), username)
        .input('password', sql.NVarChar(255), password)
        // 2. Bọc [User] bằng ngoặc vuông
        .query(`SELECT * FROM [User] WHERE username = @username AND password = @password`); 

    // 3. Nếu không có dòng nào trả về -> Sai thông tin đăng nhập
    if (result.recordset.length === 0) {
        return res.status(401).json({ 
            success: false, 
            message: "Sai username hoặc password!" 
        });
    }

    // 4. Lấy được dữ liệu thì trả về thẳng luôn, gom chung vào 1 object
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

router.post('/signup', async (req, res) => { 
  try {
    const { username, password, email, fullName } = req.body;
    
    // 1. Kiểm tra xem client có gửi thiếu dữ liệu không
    if (!username || !password || !email || !fullName) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin' });
    }

    const pool = await poolPromise; // Giả sử bạn đang dùng poolPromise để kết nối

    // =========================================================
    // 2. KIỂM TRA USERNAME ĐÃ TỒN TẠI CHƯA
    // =========================================================
    const checkUser = await pool.request()
        .input('username', sql.NVarChar(50), username)
        .query(`SELECT userID FROM [User] WHERE username = @username`);

    if (checkUser.recordset.length > 0) {
        // Trả về lỗi 409 (Conflict) nếu đã có người dùng tên này
        return res.status(409).json({ 
            success: false, 
            message: "Tên đăng nhập này đã tồn tại, vui lòng chọn tên khác!" 
        });
    }

    // =========================================================
    // 3. NẾU CHƯA CÓ -> THÊM VÀO BẢNG USER VÀ STUDENT
    // =========================================================
    const insertResult = await pool.request()
        .input('username', sql.NVarChar(50), username)
        .input('password', sql.NVarChar(255), password) // Map vào cột passwordHash
        .input('email', sql.NVarChar(100), email)
        .input('fullName', sql.NVarChar(100), fullName)
        .input('role', sql.NVarChar(20), 'student') // Cấp quyền mặc định là học sinh
        .query(`
            BEGIN TRANSACTION;
            BEGIN TRY
                -- Bước A: Thêm dữ liệu vào bảng User
                INSERT INTO [User] (username, passwordHash, email, fullName, role)
                VALUES (@username, @password, @email, @fullName, @role);

                -- Bước B: Lấy ID (userID) vừa được hệ thống tự động tạo ra
                DECLARE @NewUserID INT = SCOPE_IDENTITY();

                -- Bước C: Lấy cái ID đó nhét sang bảng Student. 
                -- Các cột Exp, Streak sẽ tự động nhận giá trị Default là 0.
                INSERT INTO [Student] (studentID)
                VALUES (@NewUserID);

                COMMIT TRANSACTION; -- Hoàn tất và lưu vào database

                -- Trả về cái ID mới để backend biết
                SELECT @NewUserID AS newUserID;
            END TRY
            BEGIN CATCH
                ROLLBACK TRANSACTION; -- Nếu lỗi ở đâu đó, quay xe hủy toàn bộ, không lưu gì cả
                THROW; -- Báo lỗi ra cho Node.js bắt
            END CATCH
        `);

    // Nếu chạy thành công xuống tận đây, lấy ID mới để báo về cho App
    const newUserID = insertResult.recordset[0].newUserID;

    res.status(201).json({ 
        success: true, 
        message: 'Đăng ký tài khoản thành công!',
        userID: newUserID
    });

  } catch (error) {
    console.error("Lỗi API Đăng ký:", error);
    res.status(500).json({ success: false, message: 'Lỗi hệ thống máy chủ' });
  }
});



module.exports = router;
