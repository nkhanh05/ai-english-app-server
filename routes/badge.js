const express = require('express');
const router = express.Router();
const db = require('../db'); // File config kết nối PostgreSQL của bạn (Pool)

// ==========================================
// 1. DÀNH CHO ADMIN
// ==========================================

// Thêm huy hiệu mới
router.post('/admin/add', async (req, res) => {
    const { badgeName, description, type, adminID, expRequire, friendRequire, streakCount } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // 1. Insert vào bảng cha (Badge)
        const insertBadgeQuery = `
            INSERT INTO public."Badge" ("badgeName", "description", "type", "AdminID") 
            VALUES ($1, $2, $3, $4) RETURNING "badgeID"
        `;
        const badgeResult = await client.query(insertBadgeQuery, [badgeName, description, type, adminID]);
        const badgeID = badgeResult.rows[0].badgeID;

        // 2. Insert vào bảng con tương ứng dựa trên 'type'
        if (type === 'Exp') {
            await client.query('INSERT INTO public."ExpBadge" ("badgeID", "ExpRequire") VALUES ($1, $2)', [badgeID, expRequire]);
        } else if (type === 'Friend') {
            await client.query('INSERT INTO public."FriendBadge" ("badgeID", "friendRequire") VALUES ($1, $2)', [badgeID, friendRequire]);
        } else if (type === 'Streak') {
            await client.query('INSERT INTO public."StreakBadge" ("badgeID", "streakCount") VALUES ($1, $2)', [badgeID, streakCount]);
        }

        await client.query('COMMIT');
        res.status(201).json({ message: "Thêm huy hiệu thành công" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Lỗi thêm huy hiệu:", error);
        res.status(500).json({ error: "Lỗi server" });
    } finally {
        client.release();
    }
});

// Cập nhật huy hiệu
router.put('/admin/update/:badgeId', async (req, res) => {
    const badgeId = req.params.badgeId;
    const { badgeName, description, type, expRequire, friendRequire, streakCount } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Cập nhật bảng cha
        await client.query(`
            UPDATE public."Badge" 
            SET "badgeName" = $1, "description" = $2, "type" = $3 
            WHERE "badgeID" = $4
        `, [badgeName, description, type, badgeId]);

        // Xóa thông tin ở bảng con cũ (đề phòng đổi type)
        await client.query('DELETE FROM public."ExpBadge" WHERE "badgeID" = $1', [badgeId]);
        await client.query('DELETE FROM public."FriendBadge" WHERE "badgeID" = $1', [badgeId]);
        await client.query('DELETE FROM public."StreakBadge" WHERE "badgeID" = $1', [badgeId]);

        // Insert lại vào bảng con mới
        if (type === 'Exp') {
            await client.query('INSERT INTO public."ExpBadge" ("badgeID", "ExpRequire") VALUES ($1, $2)', [badgeId, expRequire]);
        } else if (type === 'Friend') {
            await client.query('INSERT INTO public."FriendBadge" ("badgeID", "friendRequire") VALUES ($1, $2)', [badgeId, friendRequire]);
        } else if (type === 'Streak') {
            await client.query('INSERT INTO public."StreakBadge" ("badgeID", "streakCount") VALUES ($1, $2)', [badgeId, streakCount]);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: "Cập nhật thành công" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Lỗi cập nhật huy hiệu:", error);
        res.status(500).json({ error: "Lỗi server" });
    } finally {
        client.release();
    }
});

// Xóa huy hiệu
router.delete('/admin/delete/:badgeId', async (req, res) => {
    const badgeId = req.params.badgeId;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // Phải xóa khóa ngoại ở các bảng con và bảng liên kết trước
        await client.query('DELETE FROM public."Student_Badge" WHERE "badgeID" = $1', [badgeId]);
        await client.query('DELETE FROM public."ExpBadge" WHERE "badgeID" = $1', [badgeId]);
        await client.query('DELETE FROM public."FriendBadge" WHERE "badgeID" = $1', [badgeId]);
        await client.query('DELETE FROM public."StreakBadge" WHERE "badgeID" = $1', [badgeId]);
        
        // Cuối cùng xóa bảng cha
        await client.query('DELETE FROM public."Badge" WHERE "badgeID" = $1', [badgeId]);

        await client.query('COMMIT');
        res.status(200).json({ message: "Xóa thành công" });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Lỗi xóa huy hiệu:", error);
        res.status(500).json({ error: "Lỗi server" });
    } finally {
        client.release();
    }
});

// ==========================================
// 2. DÀNH CHO STUDENT
// ==========================================

// Lấy danh sách huy hiệu ĐÃ SỞ HỮU (Dựa theo logic parse của Flutter: item['Badge'])
router.get('/student/:studentId/owned', async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const query = `
            SELECT b.*, 
                   eb."ExpRequire", 
                   fb."friendRequire", 
                   sb."streakCount"
            FROM public."Badge" b
            INNER JOIN public."Student_Badge" stb ON b."badgeID" = stb."badgeID"
            LEFT JOIN public."ExpBadge" eb ON b."badgeID" = eb."badgeID"
            LEFT JOIN public."FriendBadge" fb ON b."badgeID" = fb."badgeID"
            LEFT JOIN public."StreakBadge" sb ON b."badgeID" = sb."badgeID"
            WHERE stb."studentID" = $1
        `;
        const result = await db.query(query, [studentId]);
        
        // Format lại JSON khớp với Badge.fromJson bên Flutter
        const formattedData = result.rows.map(row => {
            let badgeObj = {
                badgeName: row.badgeName,
                description: row.description,
                type: row.type,
            };

            if (row.type === 'Exp') badgeObj.ExpBadge = [{ ExpRequire: row.ExpRequire }];
            if (row.type === 'Friend') badgeObj.FriendBadge = [{ friendRequire: row.friendRequire }];
            if (row.type === 'Streak') badgeObj.StreakBadge = [{ streakCount: row.streakCount }];

            return { Badge: badgeObj };
        });

        res.status(200).json(formattedData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Lấy danh sách huy hiệu CHƯA SỞ HỮU
router.get('/student/:studentId/unowned', async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const query = `
            SELECT b.*, 
                   eb."ExpRequire", 
                   fb."friendRequire", 
                   sb."streakCount"
            FROM public."Badge" b
            LEFT JOIN public."ExpBadge" eb ON b."badgeID" = eb."badgeID"
            LEFT JOIN public."FriendBadge" fb ON b."badgeID" = fb."badgeID"
            LEFT JOIN public."StreakBadge" sb ON b."badgeID" = sb."badgeID"
            WHERE b."badgeID" NOT IN (
                SELECT "badgeID" FROM public."Student_Badge" WHERE "studentID" = $1
            )
        `;
        const result = await db.query(query, [studentId]);

        // Format lại dữ liệu phẳng theo yêu cầu bên Flutter unowned
        const formattedData = result.rows.map(row => {
            let badgeObj = {
                badgeName: row.badgeName,
                description: row.description,
                type: row.type,
            };

            if (row.type === 'Exp') badgeObj.ExpBadge = [{ ExpRequire: row.ExpRequire }];
            if (row.type === 'Friend') badgeObj.FriendBadge = [{ friendRequire: row.friendRequire }];
            if (row.type === 'Streak') badgeObj.StreakBadge = [{ streakCount: row.streakCount }];

            return badgeObj;
        });

        res.status(200).json(formattedData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;