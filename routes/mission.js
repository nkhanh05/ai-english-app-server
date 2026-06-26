const express = require('express');
const router = express.Router();
const db = require('../db');

// Lấy toàn bộ danh sách nhiệm vụ (Admin)
router.get('/admin/select', async (req, res) => {
    try {
        const query = `
            SELECT m.*, 
                   fm."friendRequire", 
                   wm."wordRequire"
            FROM public."Mission" m
            LEFT JOIN public."FriendMission" fm ON m."missionID" = fm."missionID"
            LEFT JOIN public."WordMission" wm ON m."missionID" = wm."missionID"
        `;
        const result = await db.query(query);

        const formattedData = result.rows.map(row => {
            let missionObj = {
                missionName: row.missionName,
                description: row.description,
                type: row.type,
                startAt: row.startAt,
                endAt: row.endAt
            };

            if (row.type === 'Friend') missionObj.FriendMission = [{ friendRequire: row.friendRequire }];
            if (row.type === 'Word') missionObj.WordMission = [{ wordRequire: row.wordRequire }];

            return missionObj;
        });

        res.status(200).json(formattedData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Lấy nhiệm vụ của học sinh kèm theo tiến độ
router.get('/student/:studentID', async (req, res) => {
    const studentID = req.params.studentID;
    try {
        const query = `
            SELECT sm.status, 
                   sm.progress, 
                   m.*, 
                   fm."friendRequire", 
                   wm."wordRequire"
            FROM public."Student_Mission" sm
            INNER JOIN public."Mission" m ON sm."missionID" = m."missionID"
            LEFT JOIN public."FriendMission" fm ON m."missionID" = fm."missionID"
            LEFT JOIN public."WordMission" wm ON m."missionID" = wm."missionID"
            WHERE sm."studentID" = $1
        `;
        const result = await db.query(query, [studentID]);

        // Định dạng dữ liệu khớp với class StudentMissionDetail bên Flutter
        const formattedData = result.rows.map(row => {
            let missionObj = {
                missionName: row.missionName,
                description: row.description,
                type: row.type,
                startAt: row.startAt,
                endAt: row.endAt
            };

            if (row.type === 'Friend') missionObj.FriendMission = [{ friendRequire: row.friendRequire }];
            if (row.type === 'Word') missionObj.WordMission = [{ wordRequire: row.wordRequire }];

            return {
                Mission: missionObj,
                status: row.status, // unfinished hoặc finished
                progress: row.progress
            };
        });

        res.status(200).json(formattedData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;