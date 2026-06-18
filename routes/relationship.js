var express = require('express');
var router = express.Router();

/* GET home page. */
const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { poolPromise } = require('./db'); // Điều chỉnh lại đường dẫn tới file cấu hình DB của bạn


router.get('/friend/:userID', async function(req, res) {
  const userID = req.params.userID;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userID', sql.Int, userID)
      .query(`
        SELECT 
            U.fullName, 
            U.avatarUrl, 
            U.username, 
            S.studentID, 
            S.weeklyExp, 
            S.totalExp, 
            S.streak, 
            S.isStreakmaintained
        FROM [User] U
        JOIN [Student] S ON U.userID = S.studentID
        JOIN [Relationship] R ON (S.studentID = R.StudentID_1 OR S.studentID = R.StudentID_2)
        WHERE (R.StudentID_1 = @userID OR R.StudentID_2 = @userID)
          AND S.studentID != @userID
          AND R.Status = 'Friend' -- Thay 'Friend' bằng status thực tế của bạn (VD: 'Accepted')
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching friends:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Lấy danh sách người theo dõi (follower)
router.get('/follower/:userID', async function(req, res) {
  const userID = req.params.userID;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userID', sql.Int, userID)
      .query(`
        SELECT 
            U.fullName, 
            U.avatarUrl, 
            U.username, 
            S.studentID, 
            S.weeklyExp, 
            S.totalExp, 
            S.streak, 
            S.isStreakmaintained
        FROM [User] U
        JOIN [Student] S ON U.userID = S.studentID
        JOIN [Relationship] R ON S.studentID = R.StudentID_1
        WHERE R.StudentID_2 = @userID
          AND R.Status = 'Follow' -- Thay 'Follow' bằng status thực tế nếu cần
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching followers:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Lấy danh sách đang theo dõi (following)
router.get('/following/:userID', async function(req, res) {
  const userID = req.params.userID;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('userID', sql.Int, userID)
      .query(`
        SELECT 
            U.fullName, 
            U.avatarUrl, 
            U.username, 
            S.studentID, 
            S.weeklyExp, 
            S.totalExp, 
            S.streak, 
            S.isStreakmaintained
        FROM [User] U
        JOIN [Student] S ON U.userID = S.studentID
        JOIN [Relationship] R ON S.studentID = R.StudentID_2
        WHERE R.StudentID_1 = @userID
          AND R.Status = 'Follow' -- Thay 'Follow' bằng status thực tế nếu cần
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Error fetching following:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


module.exports = router;
