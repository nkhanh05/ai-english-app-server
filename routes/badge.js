const express = require('express');
const router = express.Router();
const supabase = require('../db'); // Trỏ đến file config Supabase JS của bạn

// ==========================================
// 1. DÀNH CHO ADMIN
// ==========================================
router.get('/admin/select', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Badge')
            .select(`
                *,
                ExpBadge (ExpRequire),
                FriendBadge (friendRequire),
                StreakBadge (streakCount)
            `)
            .order('badgeID', { ascending: true }); // Sắp xếp theo ID cho đẹp

        if (error) throw error;
        
        // Dữ liệu trả về sẽ tự động có format: 
        // [{ badgeID, badgeName, type: 'Exp', ExpBadge: [{ExpRequire: 100}], ... }]
        // Format này khớp hoàn hảo 100% với hàm Badge.fromJson bên Flutter của bạn!
        res.status(200).json(data);
    } catch (error) {
        console.error("Lỗi lấy danh sách huy hiệu (Admin):", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// POST /api/badge/check/:studentID
router.post('/badge/check/:studentID', async (req, res) => {
  const { studentID } = req.params;

  try {
    // 1. Lấy thông tin hiện tại của Student (Streak, TotalExp)
    const { data: student, error: studentError } = await supabase
      .from('Student')
      .select('streak, totalExp')
      .eq('studentID', studentID)
      .single();

    if (studentError) throw studentError;

    // Lấy tổng số lượng bạn bè hiện tại
    const { count: totalFriends, error: friendError } = await supabase
      .from('Relationship')
      .select('*', { count: 'exact', head: true })
      .or(`StudentID_1.eq.${studentID},StudentID_2.eq.${studentID}`)
      .eq('Status', 'accepted');

    // 2. Lấy danh sách các huy hiệu MÀ HỌC SINH CHƯA CÓ
    const { data: unearnedBadges, error: badgeError } = await supabase
      .rpc('get_unearned_badges', { p_student_id: studentID }); 
      // *Lưu ý: Bạn có thể cần tạo 1 view hoặc query raw để lấy các badge chưa sở hữu. 
      // Ở đây ta mô phỏng bằng cách lấy toàn bộ badge rồi filter.

    const { data: allBadges } = await supabase
      .from('Badge')
      .select(`
        badgeID, type,
        ExpBadge(ExpRequire),
        StreakBadge(streakCount),
        FriendBadge(friendRequire)
      `);

    const { data: earnedBadges } = await supabase
      .from('Student_Badge')
      .select('badgeID')
      .eq('studentID', studentID);

    const earnedBadgeIds = earnedBadges.map(b => b.badgeID);
    const newBadgesToAward = [];

    // 3. Kiểm tra điều kiện cho từng loại huy hiệu
    for (const badge of allBadges) {
      if (earnedBadgeIds.includes(badge.badgeID)) continue; // Bỏ qua nếu đã có

      let conditionMet = false;

      if (badge.type === 'exp' && badge.ExpBadge) {
        conditionMet = student.totalExp >= badge.ExpBadge.ExpRequire;
      } 
      else if (badge.type === 'streak' && badge.StreakBadge) {
        conditionMet = student.streak >= badge.StreakBadge.streakCount;
      } 
      else if (badge.type === 'friend' && badge.FriendBadge) {
        conditionMet = totalFriends >= badge.FriendBadge.friendRequire;
      }

      if (conditionMet) {
        newBadgesToAward.push({ studentID: studentID, badgeID: badge.badgeID });
      }
    }

    // 4. Cấp huy hiệu mới (Thêm vào bảng Student_Badge)
    if (newBadgesToAward.length > 0) {
      const { error: insertError } = await supabase
        .from('Student_Badge')
        .insert(newBadgesToAward);

      if (insertError) throw insertError;
    }

    res.status(200).json({ 
      message: 'Kiểm tra thành công', 
      awarded: newBadgesToAward 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thêm huy hiệu mới
router.post('/admin/add', async (req, res) => {
    const { badgeName, description, type, adminID, expRequire, friendRequire, streakCount } = req.body;
    let newBadgeID = null;

    try {
        // 1. Insert vào bảng cha (Badge) và lấy badgeID về
        const { data: badgeData, error: badgeErr } = await supabase
            .from('Badge')
            // Bỏ 'category' vì trong database.doc của bạn chỉ có 'type'
            .insert([{ badgeName, description, type, AdminID: adminID }])
            .select('badgeID')
            .single();

        if (badgeErr) throw badgeErr;
        newBadgeID = badgeData.badgeID;

        // 2. Insert vào bảng con tương ứng
        let childErr = null;
        if (type === 'Exp') {
            const { error } = await supabase.from('ExpBadge').insert([{ badgeID: newBadgeID, ExpRequire: expRequire }]);
            childErr = error;
        } else if (type === 'Friend') {
            const { error } = await supabase.from('FriendBadge').insert([{ badgeID: newBadgeID, friendRequire: friendRequire }]);
            childErr = error;
        } else if (type === 'Streak') {
            const { error } = await supabase.from('StreakBadge').insert([{ badgeID: newBadgeID, streakCount: streakCount }]);
            childErr = error;
        }

        if (childErr) throw childErr;

        res.status(201).json({ message: "Thêm huy hiệu thành công" });
    } catch (error) {
        // Kỹ thuật Manual Rollback: Nếu lỗi tạo bảng con, tự động xóa bảng cha đi
        if (newBadgeID) {
            await supabase.from('Badge').delete().eq('badgeID', newBadgeID);
        }
        console.error("Lỗi thêm huy hiệu:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Cập nhật huy hiệu
router.put('/admin/update/:badgeId', async (req, res) => {
    const badgeId = req.params.badgeId;
    const { badgeName, description, type, expRequire, friendRequire, streakCount } = req.body;

    try {
        // 1. Cập nhật bảng cha
        const { error: updateErr } = await supabase
            .from('Badge')
            .update({ badgeName, description, type })
            .eq('badgeID', badgeId);

        if (updateErr) throw updateErr;

        // 2. Xóa các record ở bảng con cũ (Tránh trường hợp bị rác khi Update đổi type)
        await Promise.all([
            supabase.from('ExpBadge').delete().eq('badgeID', badgeId),
            supabase.from('FriendBadge').delete().eq('badgeID', badgeId),
            supabase.from('StreakBadge').delete().eq('badgeID', badgeId),
        ]);

        // 3. Tạo record bảng con mới
        if (type === 'Exp') {
            await supabase.from('ExpBadge').insert([{ badgeID: badgeId, ExpRequire: expRequire }]);
        } else if (type === 'Friend') {
            await supabase.from('FriendBadge').insert([{ badgeID: badgeId, friendRequire: friendRequire }]);
        } else if (type === 'Streak') {
            await supabase.from('StreakBadge').insert([{ badgeID: badgeId, streakCount: streakCount }]);
        }

        res.status(200).json({ message: "Cập nhật thành công" });
    } catch (error) {
        console.error("Lỗi cập nhật huy hiệu:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Xóa huy hiệu
router.delete('/admin/delete/:badgeId', async (req, res) => {
    const badgeId = req.params.badgeId;

    try {
        // Xóa bảng con & liên kết trước
        await Promise.all([
            supabase.from('Student_Badge').delete().eq('badgeID', badgeId),
            supabase.from('ExpBadge').delete().eq('badgeID', badgeId),
            supabase.from('FriendBadge').delete().eq('badgeID', badgeId),
            supabase.from('StreakBadge').delete().eq('badgeID', badgeId),
        ]);

        // Cuối cùng xóa bảng cha
        const { error: deleteErr } = await supabase
            .from('Badge')
            .delete()
            .eq('badgeID', badgeId);

        if (deleteErr) throw deleteErr;

        // HTTP 204 No Content là chuẩn nhất cho Delete hoặc 200 tùy bạn
        res.status(200).json({ message: "Xóa thành công" });
    } catch (error) {
        console.error("Lỗi xóa huy hiệu:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// ==========================================
// 2. DÀNH CHO STUDENT
// ==========================================

// Lấy danh sách huy hiệu ĐÃ SỞ HỮU
// Lấy danh sách huy hiệu ĐÃ SỞ HỮU
router.get('/student/:studentId/owned', async (req, res) => {
    // ÉP KIỂU SANG SỐ NGUYÊN
    const studentId = parseInt(req.params.studentId, 10); 
    try {
        const { data, error } = await supabase
            .from('Student_Badge')
            // GHI TRỰC TIẾP TÊN BẢNG, KHÔNG DÙNG ALIAS
            .select(`
                Badge (
                    badgeID,
                    badgeName,
                    description,
                    type,
                    ExpBadge (ExpRequire),
                    FriendBadge (friendRequire),
                    StreakBadge (streakCount)
                )
            `)
            .eq('studentID', studentId);

        if (error) throw error;
        res.status(200).json(data);
    } catch (error) {
        console.error("Lỗi lấy huy hiệu:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

// Lấy danh sách huy hiệu CHƯA SỞ HỮU
router.get('/student/:studentId/unowned', async (req, res) => {
    const studentId = parseInt(req.params.studentId, 10);
    try {
        const [allBadgesRes, ownedRes] = await Promise.all([
            supabase.from('Badge').select(`*, ExpBadge (ExpRequire), FriendBadge (friendRequire), StreakBadge (streakCount)`),
            supabase.from('Student_Badge').select('badgeID').eq('studentID', studentId)
        ]);

        if (allBadgesRes.error) throw allBadgesRes.error;
        if (ownedRes.error) throw ownedRes.error;

        const ownedIds = ownedRes.data.map(item => item.badgeID);
        const unownedBadges = allBadgesRes.data.filter(badge => !ownedIds.includes(badge.badgeID));

        res.status(200).json(unownedBadges);
    } catch (error) {
        console.error("Lỗi lấy huy hiệu chưa có:", error);
        res.status(500).json({ error: "Lỗi server" });
    }
});

module.exports = router;