var express = require('express');
var router = express.Router();

var userRouter = require('./routes/user');
var relationshipRouter = require('./routes/relationship');
var wordRouter = require('./routes/word');
var badgeRouter = require('./routes/badge');
var missionRouter = require('./routes/mission');
var notificationRouter = require('./routes/notification');
var exerciseRouter = require('./routes/exercise');

app.post('/query', async (req, res) => {
    try {
        // Lấy câu query từ Flutter gửi lên (trong body)
        const customQuery = req.body.query; 

        if (!customQuery) {
            return res.status(400).send("Thiếu câu lệnh SQL!");
        }

        let pool = await sql.connect(config);
        let result = await pool.request().query(customQuery); 
        
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send("Lỗi truy vấn: " + err.message);
    }
});

app.post('/check/word/', async (req, res) => {
    try {
        const { term, definition } = req.body;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('term', sql.NVarChar(255), term)
            .input('definition', sql.NVarChar(255), definition)
            .query(`SELECT * FROM Word WHERE term = @term AND definition = @definition`); // chỉ select cột cần thiết

        if (result.recordset.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Không tìm thấy từ vựng này" 
            });
        }

        res.status(200).json({
            success: true,
            data: result.recordset[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});




// them tư vao word neu thoa man

app.post('/insert/word', async (req, res) => {
    try {
        const { term, definition } = req.body; 
        const pool = await poolPromise;
        const result = await pool.request()
            .input('term', sql.NVarChar(100), term) // Khai báo đây là số Nguyên (Int)
            .input('definition', sql.NVarChar(sql.MAX), definition)
            .query("INSERT INTO Word (term, definition) VALUES (@term, @definition)");
        res.status(201).json({ 
            message: "Insert success", 
        });
    } catch (err) {
        res.status(500).send("Lỗi chèn dữ liệu: " + err.message);
    }
});



// them tu vao userword
app.post('/insert/user_word', async (req, res) => {
    try {
        const { userID, wordID,photoUrl } = req.body; // Lấy user_id và word_id từ body
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, userID) // Khai báo đây là số Nguyên (Int)
            .input('word_id', sql.Int, wordID) // Khai báo đây là số Nguyên (Int)
            .input('photo_url', sql.NVarChar(sql.MAX), photoUrl) // Khai báo đây là chuỗi (NVARCHAR)
            .query("INSERT INTO User_Word (userID, wordID, photoUrl) VALUES (@user_id, @word_id, @photo_url)");
        res.status(201).json({ 
            message: "Insert success", 
        });
    } catch (err) {
        res.status(500).send("Lỗi chèn dữ liệu: " + err.message);
    }
});

app.get('/select/user_words/:userID', async (req, res) => {
    try {
        const { userID } = req.params; 
        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, userID)
            .query(`
                SELECT 
                    W.term, 
                    W.defination, 
                    UW.photoUrl AS Image_Url, 
                    UW.createdAt 
                FROM User_Word UW
                JOIN Word W ON UW.wordID = W.wordID
                WHERE UW.userID = @user_id
            `);
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).send("Lỗi lấy danh sách từ: " + err.message);
    }
});


app.post('/select/people', async (req, res) => {
    try {
        
        const pool = await poolPromise;

        const result = await pool.request()
            .query(`
                SELECT 
                    u.username,
                    u.name,
                    u.avatarUrl,
                    s.totalExp,
                    s.weeklyExp,
                    s.streak,
                    s.isStreakmaintained
                FROM Student s 
                INNER JOIN Users u ON s.studentID = u.userID
                ORDER BY u.name ASC;
            `);

        res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (err) {
        console.error('Error fetching friends:', err);
        res.status(500).json({ 
            success: false,
            message: "Lỗi server khi lấy danh sách bạn bè" 
        });
    }
});



app.get('/select/friends/:userID', async (req, res) => {
    try {
        const { userID } = req.params;

        if (!userID || isNaN(parseInt(userID))) {
            return res.status(400).json({ 
                success: false, 
                message: "userID không hợp lệ" 
            });
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input('user_id', sql.Int, parseInt(userID))
            .query(`
                SELECT 
                    u.username,
                    u.name,
                    u.avatarUrl,
                    s.totalExp,
                    s.weeklyExp,
                    s.streak,
                    s.isStreakmaintained
                FROM Relationship r
                INNER JOIN Student s ON r.Friend_ID = s.studentID
                INNER JOIN Users u ON s.studentID = u.userID
                WHERE r.User_ID = @user_id and r.isFriend = 1
                ORDER BY u.name ASC;
            `);

        res.status(200).json({
            success: true,
            data: result.recordset
        });

    } catch (err) {
        console.error('Error fetching friends:', err);
        res.status(500).json({ 
            success: false,
            message: "Lỗi server khi lấy danh sách bạn bè" 
        });
    }
});


app.get('/select/following/:userID', async (req, res) => {
    try {
        const { userID } = req.params;
        const parsedUserID = parseInt(userID);

        if (isNaN(parsedUserID)) {
            return res.status(400).json({ success: false, message: "userID không hợp lệ" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, parsedUserID)
            .query(`
                SELECT 
                    u.username,
                    u.name,
                    u.avatarUrl,
                    s.totalExp,
                    s.streak,
                    f.StudentID_2 AS FollowingID
                FROM Friendship f
                INNER JOIN Student s ON f.StudentID_2 = s.studentID
                INNER JOIN Users u ON s.studentID = u.userID
                WHERE f.StudentID_1 = @user_id
                ORDER BY u.name ASC;
            `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (err) {
        console.error('Error fetching following:', err);
        res.status(500).json({ success: false, message: "Lỗi server khi lấy danh sách following" });
    }
});

app.get('/select/followers/:userID', async (req, res) => {
    try {
        const { userID } = req.params;
        const parsedUserID = parseInt(userID);

        if (isNaN(parsedUserID)) {
            return res.status(400).json({ success: false, message: "userID không hợp lệ" });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('user_id', sql.Int, parsedUserID)
            .query(`
                SELECT 
                    u.username,
                    u.avatarUrl,
                    s.totalExp,
                    s.streak,
                    f.StudentID_1 AS FollowerID
                FROM Friendship f
                INNER JOIN Student s ON f.StudentID_1 = s.studentID
                INNER JOIN Users u ON s.studentID = u.userID
                WHERE f.StudentID_2 = @user_id
                ORDER BY u.username ASC;
            `);

        res.status(200).json({
            success: true,
            count: result.recordset.length,
            data: result.recordset
        });
    } catch (err) {
        console.error('Error fetching followers:', err);
        res.status(500).json({ success: false, message: "Lỗi server khi lấy danh sách followers" });
    }
});







app.post('/select/user_word/:userID', async (req, res) => {
    try {
        const userID= req.params.userID;
        const pool = await poolPromise;

        const sqlQuery = `
            SELECT 
                uw.*, 
                w.term, 
                w.definition 
            FROM User_Word uw
            INNER JOIN Word w ON uw.wordID = w.wordID
            WHERE uw.userID = @user_id;
        `;

        const result = await pool.request()
            .input('user_id', sql.Int, userID)
            .query(sqlQuery);

        res.status(200).json(result.recordset); 
    } catch (err) {
        res.status(500).send("Lỗi truy vấn dữ liệu: " + err.message);
    }
});



module.exports = router;
