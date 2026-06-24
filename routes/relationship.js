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
        const { data: rels, error } = await supabase
            .from('Relationship')
            .select('StudentID_1, StudentID_2')
            .or(`StudentID_1.eq.${userID},StudentID_2.eq.${userID}`)
            .eq('Status', 'accepted'); // Đã map theo script.sql của bạn

        if (error) throw error;
        
        const friendIDs = rels.map(r => r.StudentID_1 == userID ? r.StudentID_2 : r.StudentID_1);
        if (friendIDs.length === 0) return res.status(200).json([]);

        const { data: friends } = await supabase
            .from('Student')
            .select('studentID, weeklyExp, totalExp, streak, isStreakmaintained, User!inner(fullName, avatarUrl, username)')
            .in('studentID', friendIDs);

        res.status(200).json(formatUserData(friends));
    } catch (err) {
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
            .eq('StudentID_2', userID)
            .eq('Status', 'Follow');

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
            .eq('StudentID_1', userID)
            .eq('Status', 'Follow');

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