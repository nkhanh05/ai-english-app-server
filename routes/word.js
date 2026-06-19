var express = require('express');
var router = express.Router();
const { poolPromise, sql } = require('../db');

// Helper kiểm tra kết nối Database
const getPool = async () => {
    const pool = await poolPromise;
    if (!pool) throw new Error("Database connection failed");
    return pool;
};




router.post('/addWord', async (req, res) => {
    try {
        // Gom tất cả data cần thiết vào 1 cục từ Flutter gởi lên
        const { userID, term, definition, photoUrl } = req.body;
        const pool = await poolPromise;

        // Mã T-SQL thực thi toàn bộ logic: Kiểm tra -> Thêm Word -> Thêm User_Word
        const query = `
            DECLARE @CurrentWordID INT;

            -- Bước 1: Tìm xem từ đã có trong bảng Word chưa
            SELECT @CurrentWordID = wordID 
            FROM Word 
            WHERE term = @term AND definition = @definition;

            -- Bước 2: Nếu chưa có (NULL), tiến hành chèn vào bảng Word
            IF @CurrentWordID IS NULL
            BEGIN
                INSERT INTO Word (term, definition) 
                VALUES (@term, @definition);
                
                -- Lấy ngay wordID của từ vừa chèn
                SET @CurrentWordID = SCOPE_IDENTITY(); 
            END

            -- Bước 3: Lưu vào thư viện User_Word
            -- Có thêm lệnh kiểm tra để tránh lưu trùng: Nếu user đã có từ này rồi thì thôi không lưu nữa
            IF NOT EXISTS (SELECT 1 FROM User_Word WHERE userID = @userID AND wordID = @CurrentWordID)
            BEGIN
                INSERT INTO User_Word (userID, wordID, photoUrl) 
                VALUES (@userID, @CurrentWordID, @photoUrl);
            END
        `;

        // Chỉ cần 1 lần kết nối CSDL duy nhất
        await pool.request()
            .input('userID', sql.Int, userID)
            .input('term', sql.NVarChar(100), term)
            .input('definition', sql.NVarChar(sql.MAX), definition)
            .input('photoUrl', sql.NVarChar(sql.MAX), photoUrl)
            .query(query);

        res.status(200).json({
            success: true,
            message: "Đã lưu từ vựng vào thư viện thành công!"
        });

    } catch (err) {
        console.error("Lỗi khi lưu từ:", err);
        res.status(500).json({ success: false, message: "Lỗi hệ thống: " + err.message });
    }
});


module.exports = router;
