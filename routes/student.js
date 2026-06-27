// student.js
var express = require('express');
var router = express.Router();
const supabase = require('../db');


// ==========================================
// 1. API Cập nhật Streak
// Yêu cầu: Kiểm tra isStreakmaintained, nếu false thì +1 streak và đổi thành true. Nếu true thì giữ nguyên.
// ==========================================
router.put('/:studentId/streak', async (req, res) => {
    const studentID = parseInt(req.params.studentId, 10);

    try {
        // Bước 1: Lấy thông tin streak hiện tại của học sinh
        const { data: studentData, error: fetchError } = await supabase
            .from('Student')
            .select('streak, isStreakmaintained')
            .eq('studentID', studentID)
            .single();

        if (fetchError) throw fetchError;

        // Bước 2: Kiểm tra xem hôm nay đã duy trì streak chưa
        if (studentData.isStreakmaintained === true) {
            return res.status(200).json({ 
                success: true, 
                message: "Streak đã được duy trì trước đó, không cộng thêm." 
            });
        }

        // Bước 3: Nếu chưa duy trì, tiến hành +1 streak và cập nhật trạng thái
        const newStreak = (studentData.streak || 0) + 1;
        
        const { error: updateError } = await supabase
            .from('Student')
            .update({ 
                streak: newStreak, 
                isStreakmaintained: true 
            })
            .eq('studentID', studentID);

        if (updateError) throw updateError;

        res.status(200).json({ 
            success: true, 
            message: "Cập nhật Streak thành công!", 
            newStreak: newStreak 
        });

    } catch (error) {
        console.error("Lỗi cập nhật Streak:", error);
        res.status(500).json({ success: false, error: "Lỗi server" });
    }
});

// ==========================================
// 2. API Cập nhật Tổng Kinh Nghiệm (Total EXP)
// Yêu cầu: Cộng thêm số EXP truyền vào từ body vào số EXP hiện tại trong DB
// ==========================================
router.put('/:studentId/total-exp', async (req, res) => {
    const studentID = parseInt(req.params.studentId, 10);
    // Lưu ý: totalExp gửi từ Flutter giờ đóng vai trò là "số exp được cộng thêm"
    const expToAdd = parseInt(req.body.totalExp, 10); 

    if (isNaN(expToAdd) || expToAdd <= 0) {
        return res.status(400).json({ success: false, error: "Số EXP không hợp lệ" });
    }

    try {
        // Lấy số EXP hiện tại
        const { data: studentData, error: fetchError } = await supabase
            .from('Student')
            .select('totalExp')
            .eq('studentID', studentID)
            .single();

        if (fetchError) throw fetchError;

        // Cộng dồn
        const currentExp = studentData.totalExp || 0;
        const updatedTotalExp = currentExp + expToAdd;

        // Cập nhật lại vào DB
        const { error: updateError } = await supabase
            .from('Student')
            .update({ totalExp: updatedTotalExp })
            .eq('studentID', studentID);

        if (updateError) throw updateError;

        res.status(200).json({ success: true, message: "Cập nhật Total EXP thành công", totalExp: updatedTotalExp });

    } catch (error) {
        console.error("Lỗi cập nhật Total EXP:", error);
        res.status(500).json({ success: false, error: "Lỗi server" });
    }
});

// ==========================================
// 3. API Cập nhật Kinh Nghiệm Tuần (Weekly EXP)
// Yêu cầu: Cộng thêm số EXP truyền vào từ body vào số Weekly EXP hiện tại trong DB
// ==========================================
router.put('/:studentId/weekly-exp', async (req, res) => {
    const studentID = parseInt(req.params.studentId, 10);
    // Lưu ý: weeklyExp gửi từ Flutter giờ đóng vai trò là "số exp được cộng thêm"
    const expToAdd = parseInt(req.body.weeklyExp, 10);

    if (isNaN(expToAdd) || expToAdd <= 0) {
        return res.status(400).json({ success: false, error: "Số EXP không hợp lệ" });
    }

    try {
        // Lấy số Weekly EXP hiện tại
        const { data: studentData, error: fetchError } = await supabase
            .from('Student')
            .select('weeklyExp')
            .eq('studentID', studentID)
            .single();

        if (fetchError) throw fetchError;

        // Cộng dồn
        const currentWeeklyExp = studentData.weeklyExp || 0;
        const updatedWeeklyExp = currentWeeklyExp + expToAdd;

        // Cập nhật lại vào DB
        const { error: updateError } = await supabase
            .from('Student')
            .update({ weeklyExp: updatedWeeklyExp })
            .eq('studentID', studentID);

        if (updateError) throw updateError;

        res.status(200).json({ success: true, message: "Cập nhật Weekly EXP thành công", weeklyExp: updatedWeeklyExp });

    } catch (error) {
        console.error("Lỗi cập nhật Weekly EXP:", error);
        res.status(500).json({ success: false, error: "Lỗi server" });
    }
});


router.post('/check/word/', async (req, res) => {
    try {
        const { term, definition } = req.body;
        const { data, error } = await supabase
            .from('Word')
            .select('*')
            .eq('term', term)
            .eq('definition', definition);

        if (error) throw error;
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy từ vựng này" });
        }

        res.status(200).json({ success: true, data: data[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

// Thêm từ vào thư viện user
router.post('/insert/user_word', async (req, res) => {
    try {
        const { userID, wordID, photoUrl } = req.body; 
        const { error } = await supabase
            .from('User_Word')
            .insert([{ userID, wordID, photoUrl }]);
            
        if (error) throw error;
        res.status(201).json({ message: "Insert success" });
    } catch (err) {
        res.status(500).send("Lỗi chèn dữ liệu: " + err.message);
    }
});

// Select từ vựng của user (JOIN bảng Word)
router.post('/select/user_word/:userID', async (req, res) => {
    try {
        const { userID } = req.params;
        const { data, error } = await supabase
            .from('User_Word')
            .select('*, Word!inner(term, definition)')
            .eq('userID', userID);

        if (error) throw error;

        // Trải phẳng object để trả về giống kết quả SQL JOIN
        const formatted = data.map(item => {
            const { Word, ...rest } = item;
            return { ...rest, term: Word.term, definition: Word.definition };
        });

        res.status(200).json(formatted); 
    } catch (err) {
        res.status(500).send("Lỗi truy vấn dữ liệu: " + err.message);
    }
});

// Lấy danh sách mọi người
router.post('/select/people', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Student')
            .select('totalExp, weeklyExp, streak, isStreakmaintained, User!inner(username, fullName, avatarUrl)')
            .order('fullName', { foreignTable: 'User', ascending: true });

        if (error) throw error;

        const formattedData = data.map(item => ({
            username: item.User.username,
            name: item.User.fullName,
            avatarUrl: item.User.avatarUrl,
            totalExp: item.totalExp,
            weeklyExp: item.weeklyExp,
            streak: item.streak,
            isStreakmaintained: item.isStreakmaintained
        }));

        res.status(200).json({ success: true, data: formattedData });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// ====================================================================
// 1. GET: LẤY GLOBAL RANKING
// ====================================================================
router.get('/allPeople', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('Student')
            .select('studentID, totalExp, weeklyExp, streak, isStreakmaintained, User!inner(username, fullName, avatarUrl)')
            .order('totalExp', { ascending: false });

        if (error) throw error;

        const formattedData = data.map(item => ({
            studentID: item.studentID,
            username: item.User.username,
            fullName: item.User.fullName,
            avatarUrl: item.User.avatarUrl,
            totalExp: item.totalExp,
            weeklyExp: item.weeklyExp,
            streak: item.streak,
            isStreakmaintained: item.isStreakmaintained
        }));

        res.status(200).json(formattedData); 
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi server" });
    }
});

// ====================================================================
// 4. GET: TÌM KIẾM THEO USERNAME
// ====================================================================
router.get('/search', async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ success: false, message: 'Vui lòng nhập username' });
        }
  
        const { data, error } = await supabase
            .from('User')
            .select(`
                userID, username, fullName, role, avatarUrl,
                Student (weeklyExp, totalExp, streak)
            `)
            .eq('username', username)
            .single(); 
  
        if (error || !data) {
            return res.status(404).json({ success: false, message: 'Không tìm được người dùng' });
        }
  
        const userData = {
            userID: data.userID,
            username: data.username,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl,
            weeklyExp: data.Student?.[0]?.weeklyExp || 0,
            totalExp: data.Student?.[0]?.totalExp || 0,
            streak: data.Student?.[0]?.streak || 0
        };
  
        res.json({ success: true, user: userData });
  
    } catch (error) {
        console.error("Lỗi API Tìm kiếm:", error);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }
});

// ====================================================================
// 2. GET: LẤY THÔNG TIN CHUẨN CỦA 1 PROFILE
// ====================================================================
router.get('/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { data, error } = await supabase
            .from('Student')
            .select('*, User!inner(username, fullName, avatarUrl, status)')
            .eq('studentID', studentId)
            .single();

        if (error || !data) return res.status(404).json({ success: false, message: "Không tìm thấy User" });

        const profileData = {
            studentID: data.studentID,
            weeklyExp: data.weeklyExp,
            totalExp: data.totalExp,
            streak: data.streak,
            isStreakmaintained: data.isStreakmaintained,
            username: data.User.username,
            fullName: data.User.fullName,
            avatarUrl: data.User.avatarUrl,
            status: data.User.status
        };

        res.status(200).json(profileData);
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
});

// ====================================================================
// 3. PUT: CẬP NHẬT PROFILE
// ====================================================================
router.put('/update/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { fullName, avatarUrl, status } = req.body; 

        // Cập nhật bảng User (vì fullName, avatarUrl nằm ở bảng User)
        const { error } = await supabase
            .from('User')
            .update({ fullName, avatarUrl, status })
            .eq('userID', studentId);

        if (error) throw error;

        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
});

//<<<<<<< HEAD
// ====================================================================
// 5. POST: FOLLOW NGƯỜI DÙNG KHÁC
// ====================================================================
// ====================================================================
// 5. POST: FOLLOW NGƯỜI DÙNG KHÁC
// ====================================================================
router.post('/follow', async (req, res) => {
    try {
        // followerID: ID của người đang dùng app bấm nút follow (StudentID_1)
        // followingID: ID của người mà bạn muốn follow (StudentID_2)
        const { followerID, followingID } = req.body;

        if (!followerID || !followingID) {
            return res.status(400).json({ success: false, message: "Thiếu ID người dùng" });
        }

        if (followerID === followingID) {
            return res.status(400).json({ success: false, message: "Không thể tự follow chính mình" });
        }

        // Map đúng tên cột StudentID_1 và StudentID_2 trong bảng Relationship
        const { error } = await supabase
            .from('Relationship') 
            .insert([{ 
                StudentID_1: followerID, 
                StudentID_2: followingID,
                Status: 'following' // Bạn có thể thêm trạng thái nếu cần dùng sau này
            }]);

        if (error) {
            // Check lỗi trùng lặp (dựa trên Primary Key của cặp StudentID_1, StudentID_2)
            if (error.code === '23505') { 
                return res.status(400).json({ success: false, message: "Bạn đã follow người này rồi" });
            }
            throw error;
        }

        res.status(201).json({ success: true, message: "Follow thành công!" });
    } catch (err) {
        console.error("Lỗi API Follow:", err);
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
});

// ====================================================================
// 6. DELETE: HỦY FOLLOW (UNFOLLOW)
// ====================================================================
router.delete('/unfollow', async (req, res) => {
    try {
        const { followerID, followingID } = req.body;

        if (!followerID || !followingID) {
            return res.status(400).json({ success: false, message: "Thiếu ID người dùng" });
        }

        // Đổi tên bảng thành Relationship và map đúng tên cột để so sánh
        const { error } = await supabase
            .from('Relationship')
            .delete()
            .eq('StudentID_1', followerID)
            .eq('StudentID_2', followingID);

        if (error) throw error;

        res.status(200).json({ success: true, message: "Đã bỏ follow thành công!" });
    } catch (err) {
        console.error("Lỗi API Unfollow:", err);
        res.status(500).json({ success: false, message: "Lỗi hệ thống" });
    }
});
module.exports = router;
//=======


module.exports = router;
//>>>>>>> 0aeee5340ff214bfa3c296e52ffc0972fa943ac2