var express = require('express');
var router = express.Router();
const supabase = require('../db');

// ====================================================================
// 1. GET: LẤY DANH SÁCH TỪ VỰNG CẦN ÔN TẬP (Dựa trên SM-2)
// ====================================================================
router.get('/revise/:userID', async (req, res) => {
    try {
        const { userID } = req.params;
        const today = new Date().toISOString().split('T')[0]; // Định dạng YYYY-MM-DD

        // =========================================================
        // BƯỚC 1: Lấy TẤT CẢ các từ đến hạn ĐÚNG HÔM NAY
        // =========================================================
        const { data: todayWords, error: todayErr } = await supabase
            .from('User_Word')
            .select('*, Word!inner(wordID, term, definition)')
            .eq('userID', userID)
            .eq('nextReview', today);

        if (todayErr) throw todayErr;

        // Nếu hôm nay có từ cần ôn, trả về ngay lập tức (không quan tâm có bao nhiêu từ)
        if (todayWords && todayWords.length > 0) {
            return res.status(200).json(formatData(todayWords));
        }

        // =========================================================
        // BƯỚC 2: Nếu không có từ nào hôm nay, lấy 20 từ gần nhất
        // =========================================================
        // Ưu tiên: Từ quá hạn (gần hôm nay nhất) -> Từ tương lai (gần hôm nay nhất)
        const { data: fallbackWords, error: fallbackErr } = await supabase
            .from('User_Word')
            .select('*, Word!inner(wordID, term, definition)')
            .eq('userID', userID)
            .order('nextReview', { ascending: true, nullsFirst: false }) // Sắp xếp theo ngày
            .limit(20);

        if (fallbackErr) throw fallbackErr;

        res.status(200).json(formatData(fallbackWords || []));

    } catch (err) {
        console.error("Lỗi lấy danh sách ôn tập:", err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Hàm hỗ trợ để code gọn gàng
function formatData(data) {
    return data.map(item => ({
        ...item,
        id: item.Word.wordID,
        term: item.Word.term,
        definition: item.Word.definition
    }));
}

// ====================================================================
// 2. POST: LƯU KẾT QUẢ BÀI TẬP VÀ CẬP NHẬT CHỈ SỐ SM-2
// ====================================================================
router.post('/saveResult', async (req, res) => {
    try {
        const { userID, type, totalCorrect, totalIncorrect, words } = req.body;

        // BƯỚC 1: Insert vào bảng ExerciseAttempt để lấy attemptID
        const { data: attempt, error: attemptError } = await supabase
            .from('ExerciseAttempt')
            .insert([{ userID, exerciseType: type, totalCorrect, totalIncorrect }])
            .select('attemptID')
            .single();

        if (attemptError) throw attemptError;
        const attemptID = attempt.attemptID;

        // BƯỚC 2: Insert hàng loạt vào bảng ExerciseDetail
        if (words && words.length > 0) {
            const detailPayload = words.map(w => ({
                attemptID: attemptID,
                userID: userID,
                wordID: w.id,
                // Trong script.sql của bạn có [status] check ('false' hoặc 'true')
                status: w.isCorrect ? 'true' : 'false' 
            }));

            const { error: detailError } = await supabase
                .from('ExerciseDetail')
                .insert(detailPayload);

            if (detailError) throw detailError;

            // BƯỚC 3: Cập nhật chỉ số SM-2 cho từng từ trong bảng User_Word
            // Do Supabase JS không hỗ trợ bulk update với điều kiện khác nhau, ta dùng Promise.all
            const updatePromises = words.map(w => {
                return supabase
                    .from('User_Word')
                    .update({
                        ef: w.ef,
                        reviewInterval: w.reviewInterval,
                        nextReview: w.nextReview,
                        lastReview: w.lastReview,
                        numberCorrect: w.numberCorrect
                    })
                    .eq('userID', userID)
                    .eq('wordID', w.id);
            });

            await Promise.all(updatePromises);
        }

        res.status(201).json({ success: true, message: "Lưu kết quả thành công!" });

    } catch (err) {
        console.error("Lỗi lưu kết quả bài tập:", err);
        res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
    }
});

module.exports = router;