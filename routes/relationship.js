// relationship.js
const express = require('express');
const router = express.Router();
const supabase = require('../db');

// Hàm format data để response giống y hệt lúc bạn xài SQL Server
const formatUserData = (usersData) => {
    return usersData.map(item => ({
        fullName: item.User.fullName,
        avatarUrl: item.User.avatarUrl,
        username: item.User.username,
        studentID: item.studentID,
        weeklyExp: item.weeklyExp,
        totalExp: item.totalExp,
        streak: item.streak,
        isStreakmaintained: item.isStreakmaintained
    }));
};

// 1. Lấy danh sách bạn bè
router.get('/friend/:userID', async function(req, res) {
    const userID = req.params.userID;
    try {
        // BƯỚC 1: Lấy danh sách ID những người mà userID ĐANG THEO DÕI
        const { data: following, error: followingErr } = await supabase
            .from('Relationship')
            .select('StudentID_2')
            .eq('StudentID_1', userID);

        if (followingErr) throw followingErr;

        // BƯỚC 2: Lấy danh sách ID những người ĐANG THEO DÕI userID
        const { data: followers, error: followersErr } = await supabase
            .from('Relationship')
            .select('StudentID_1')
            .eq('StudentID_2', userID);

        if (followersErr) throw followersErr;

        // BƯỚC 3: Lọc ra những ID trùng nhau (Follow 2 chiều)
        const followingIDs = following.map(r => r.StudentID_2);
        const followerIDs = followers.map(r => r.StudentID_1);
        
        // Trả về mảng chứa các ID có trong cả 2 danh sách
        const friendIDs = followingIDs.filter(id => followerIDs.includes(id));

        // Nếu không có ai follow 2 chiều thì trả về mảng rỗng
        if (friendIDs.length === 0) return res.status(200).json([]);

        // BƯỚC 4: Lấy thông tin chi tiết của những người bạn đó
        const { data: friends, error: friendsErr } = await supabase
            .from('Student')
            .select('studentID, weeklyExp, totalExp, streak, isStreakmaintained, User!inner(fullName, avatarUrl, username)')
            .in('studentID', friendIDs);

        if (friendsErr) throw friendsErr;

        res.status(200).json(formatUserData(friends));
    } catch (err) {
        console.error("Lỗi lấy danh sách bạn bè 2 chiều:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Lấy danh sách follower
router.get('/follower/:userID', async function(req, res) {
    const userID = req.params.userID;
    try {
        const { data: rels } = await supabase
            .from('Relationship')
            .select('StudentID_1')
            .eq('StudentID_2', userID);

        const followerIDs = rels?.map(r => r.StudentID_1) || [];
        if (followerIDs.length === 0) return res.status(200).json([]);

        const { data: followers } = await supabase
            .from('Student')
            .select('studentID, weeklyExp, totalExp, streak, isStreakmaintained, User!inner(fullName, avatarUrl, username)')
            .in('studentID', followerIDs);

        res.status(200).json(formatUserData(followers));
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 3. Lấy danh sách following
router.get('/following/:userID', async function(req, res) {
    const userID = req.params.userID;
    try {
        const { data: rels } = await supabase
            .from('Relationship')
            .select('StudentID_2')
            .eq('StudentID_1', userID);

        const followingIDs = rels?.map(r => r.StudentID_2) || [];
        if (followingIDs.length === 0) return res.status(200).json([]);

        const { data: following } = await supabase
            .from('Student')
            .select('studentID, weeklyExp, totalExp, streak, isStreakmaintained, User!inner(fullName, avatarUrl, username)')
            .in('studentID', followingIDs);

        res.status(200).json(formatUserData(following));
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;