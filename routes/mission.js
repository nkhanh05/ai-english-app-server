const express = require('express');
const router = express.Router();
const supabase = require('../db');

// ==========================================
// 1. DÀNH CHO ADMIN
// ==========================================
router.put('/mission/word/update/:studentID', async (req, res) => {
  const { studentID } = req.params;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Lấy các nhiệm vụ từ vựng đang trong thời hạn và chưa hoàn thành
    const { data: activeMissions, error: missionError } = await supabase
      .from('Student_Mission')
      .select(`
        missionID,
        status,
        Mission!inner(startAt, endAt, type),
        WordMission!inner(wordRequire)
      `)
      .eq('studentID', studentID)
      .eq('status', 'unfinished')
      .eq('Mission.type', 'word')
      .lte('Mission.startAt', today)
      .gte('Mission.endAt', today);

    if (missionError) throw missionError;

    for (const sm of activeMissions) {
      // 2. Đếm số lượng từ vựng user đã lưu trong thời gian nhiệm vụ
      const { count: wordProgress, error: countError } = await supabase
        .from('User_Word')
        .select('*', { count: 'exact', head: true })
        .eq('userID', studentID)
        .gte('createdAt', sm.Mission.startAt)
        .lte('createdAt', sm.Mission.endAt);

      if (countError) throw countError;

      // 3. Kiểm tra xem đã đạt điều kiện chưa
      const isFinished = wordProgress >= sm.WordMission.wordRequire;

      // 4. Cập nhật bảng Student_Mission
      await supabase
        .from('Student_Mission')
        .update({ 
          progress: wordProgress, 
          status: isFinished ? 'finished' : 'unfinished' 
        })
        .match({ studentID: studentID, missionID: sm.missionID });
    }

    res.status(200).json({ message: 'Cập nhật nhiệm vụ từ vựng thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/mission/friend/update/:studentID
router.put('/mission/friend/update/:studentID', async (req, res) => {
  const { studentID } = req.params;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Lấy các nhiệm vụ bạn bè đang trong thời hạn và chưa hoàn thành
    const { data: activeMissions, error: missionError } = await supabase
      .from('Student_Mission')
      .select(`
        missionID,
        status,
        Mission!inner(startAt, endAt, type),
        FriendMission!inner(friendRequire)
      `)
      .eq('studentID', studentID)
      .eq('status', 'unfinished')
      .eq('Mission.type', 'friend')
      .lte('Mission.startAt', today)
      .gte('Mission.endAt', today);

    if (missionError) throw missionError;

    for (const sm of activeMissions) {
      // 2. Đếm số lượng bạn bè mới kết bạn trong thời gian nhiệm vụ
      // Lưu ý: Tùy logic của bạn, status trong Relationship có thể là 'accepted'
      const { count: friendProgress, error: countError } = await supabase
        .from('Relationship')
        .select('*', { count: 'exact', head: true })
        .or(`StudentID_1.eq.${studentID},StudentID_2.eq.${studentID}`)
        .eq('Status', 'accepted') // Hoặc giá trị tương ứng biểu thị đã là bạn bè
        .gte('startAt', sm.Mission.startAt)
        .lte('startAt', sm.Mission.endAt);

      if (countError) throw countError;

      // 3. Kiểm tra điều kiện
      const isFinished = friendProgress >= sm.FriendMission.friendRequire;

      // 4. Cập nhật tiến độ
      await supabase
        .from('Student_Mission')
        .update({ 
          progress: friendProgress, 
          status: isFinished ? 'finished' : 'unfinished' 
        })
        .match({ studentID: studentID, missionID: sm.missionID });
    }

    res.status(200).json({ message: 'Cập nhật nhiệm vụ bạn bè thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thêm nhiệm vụ mới
router.post('/admin/add', async (req, res) => {
    const { missionName, description, type, adminID, startAt, endAt, wordRequire, friendRequire } = req.body;
    let newMissionID = null;

    try {
        const { data, error } = await supabase
            .from('Mission')
            .insert([{ missionName, description, type, AdminID: adminID, startAt: startAt || null, endAt: endAt || null }])
            .select('missionID')
            .single();

        if (error) throw error;
        newMissionID = data.missionID;

        let childErr = null;
        if (type === 'Word') {
            const { error } = await supabase.from('WordMission').insert([{ missionID: newMissionID, wordRequire }]);
            childErr = error;
        } else if (type === 'Friend') {
            const { error } = await supabase.from('FriendMission').insert([{ missionID: newMissionID, friendRequire }]);
            childErr = error;
        }

        if (childErr) throw childErr;
        res.status(201).json({ message: "Thêm nhiệm vụ thành công" });
    } catch (error) {
        if (newMissionID) await supabase.from('Mission').delete().eq('missionID', newMissionID);
        console.error("Lỗi thêm nhiệm vụ:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Cập nhật nhiệm vụ
router.put('/admin/update/:missionId', async (req, res) => {
    const missionId = req.params.missionId;
    const { missionName, description, type, startAt, endAt, wordRequire, friendRequire } = req.body;

    try {
        const { error: updateErr } = await supabase
            .from('Mission')
            .update({ missionName, description, type, startAt: startAt || null, endAt: endAt || null })
            .eq('missionID', missionId);

        if (updateErr) throw updateErr;

        await Promise.all([
            supabase.from('WordMission').delete().eq('missionID', missionId),
            supabase.from('FriendMission').delete().eq('missionID', missionId)
        ]);

        if (type === 'Word') {
            await supabase.from('WordMission').insert([{ missionID: missionId, wordRequire }]);
        } else if (type === 'Friend') {
            await supabase.from('FriendMission').insert([{ missionID: missionId, friendRequire }]);
        }

        res.status(200).json({ message: "Cập nhật thành công" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Xóa nhiệm vụ
router.delete('/admin/delete/:missionId', async (req, res) => {
    const missionId = req.params.missionId;
    try {
        await Promise.all([
            supabase.from('Student_Mission').delete().eq('missionID', missionId),
            supabase.from('WordMission').delete().eq('missionID', missionId),
            supabase.from('FriendMission').delete().eq('missionID', missionId)
        ]);

        const { error } = await supabase.from('Mission').delete().eq('missionID', missionId);
        if (error) throw error;
        res.status(200).json({ message: "Xóa thành công" });
    } catch (error) {
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Lấy toàn bộ danh sách nhiệm vụ 
router.get('/admin/select', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Mission')
            .select(`
                *,
                FriendMission (friendRequire),
                WordMission (wordRequire)
            `);

        if (error) throw error;
        
        // Data format: [{ missionID, missionName, FriendMission: [{friendRequire: X}], ... }]
        res.status(200).json(data);
    } catch (error) {
        console.error("Lỗi lấy danh sách nhiệm vụ (Admin):", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// ==========================================
// 2. DÀNH CHO STUDENT
// ==========================================

// Lấy nhiệm vụ của học sinh kèm theo tiến độ
// Lấy nhiệm vụ của học sinh kèm theo tiến độ
router.get('/student/:studentID', async (req, res) => {
    // ÉP KIỂU SANG SỐ NGUYÊN
    const studentID = parseInt(req.params.studentID, 10);
    try {
        const { data, error } = await supabase
            .from('Student_Mission')
            // GHI TRỰC TIẾP TÊN BẢNG
            .select(`
                status,
                progress,
                Mission (
                    *,
                    FriendMission (friendRequire),
                    WordMission (wordRequire)
                )
            `)
            .eq('studentID', studentID);

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error("Lỗi lấy danh sách nhiệm vụ (Student):", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;