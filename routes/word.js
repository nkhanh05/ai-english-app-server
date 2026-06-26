// word.js
var express = require('express');
var router = express.Router();
const supabase = require('../db');

router.post('/addWord', async (req, res) => {
    try {
        const { userID, term, definition, photoUrl } = req.body;
        let currentWordID;

        // Bước 1: Kiểm tra từ đã có trong bảng Word chưa
        const { data: existingWord } = await supabase
            .from('Word')
            .select('wordID')
            .eq('term', term)
            .single();

        if (existingWord) {
            currentWordID = existingWord.wordID;
        } else {
            // Bước 2: Nếu chưa có, insert và lấy ID
            const { data: newWord, error: wordError } = await supabase
                .from('Word')
                .insert([{ term, definition }])
                .select('wordID')
                .single();

            if (wordError) throw wordError;
            currentWordID = newWord.wordID;
        }

        // Bước 3: Kiểm tra user đã lưu từ này vào thư viện User_Word chưa
        const { data: existingUserWord } = await supabase
            .from('User_Word')
            .select('*')
            .eq('userID', userID)
            .eq('wordID', currentWordID)
            .single();

        // Bước 4: Nếu chưa lưu, tiến hành lưu
        if (!existingUserWord) {
            const { error: userWordError } = await supabase
                .from('User_Word')
                .insert([{ userID, wordID: currentWordID, photoUrl }]);

            if (userWordError) throw userWordError;
        }

        res.status(200).json({ success: true, message: "Đã lưu từ vựng vào thư viện thành công!" });

    } catch (err) {
        console.error("Lỗi khi lưu từ:", err);
        res.status(500).json({ success: false, message: "Lỗi hệ thống: " + err.message });
    }
});

// (Thêm vào routes/word.js)

router.get('/:userID', async (req, res) => {
    try {
        const { userID } = req.params;
        const { data, error } = await supabase
            .from('User_Word')
            .select('*, Word!inner(wordID, term, definition)')
            .eq('userID', userID);

        if (error) throw error;

        // Định dạng lại data cho khớp với WordService.dart
        const formattedWords = data.map(item => {
            const { Word, ...rest } = item;
            return { 
                ...rest, 
                wordID: Word.wordID,
                term: Word.term, 
                definition: Word.definition 
            };
        });

        // Trả về đúng object mà Flutter đang mong đợi
        res.status(200).json({
            success: true,
            words: formattedWords
        });

    } catch (err) {
        console.error("Lỗi lấy từ vựng:", err);
        res.status(500).json({ success: false, message: "Lỗi hệ thống: " + err.message });
    }
});

// Thêm đoạn code này vào file routes/word.js của bạn

// ==========================================
// API XÓA TỪ KHỎI THƯ VIỆN
// ==========================================
router.delete('/deleteWord', async (req, res) => {
    try {
        const { userID, wordID } = req.body;

        if (!userID || !wordID) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin userID hoặc wordID" });
        }

        // Chỉ xóa liên kết trong thư viện cá nhân (User_Word)
        const { error } = await supabase
            .from('User_Word')
            .delete()
            .eq('userID', userID)
            .eq('wordID', wordID);

        if (error) throw error;
        
        res.status(200).json({ success: true, message: "Đã xóa từ thành công!" });
    } catch (err) {
        console.error("Lỗi xóa từ:", err);
        res.status(500).json({ success: false, message: "Lỗi hệ thống: " + err.message });
    }
});

// ==========================================
// API CẬP NHẬT TỪ (Xóa cũ - Thêm mới)
// ==========================================
router.put('/updateWord', async (req, res) => {
    try {
        const { userID, oldWordID, newTerm, newDefinition, newPhotoUrl } = req.body;

        if (!newTerm || !newDefinition) {
            return res.status(400).json({ success: false, message: "Chưa nhập đủ thông tin từ vựng" });
        }

        // 1. Xóa liên kết cũ trong User_Word
        await supabase
            .from('User_Word')
            .delete()
            .eq('userID', userID)
            .eq('wordID', oldWordID);

        // 2. Kiểm tra xem từ mới này đã tồn tại trong từ điển chung (Word) chưa
        let currentWordID;
        const { data: existingWord } = await supabase
            .from('Word')
            .select('wordID')
            .eq('term', newTerm)
            .eq('definition', newDefinition)
            .single();

        if (existingWord) {
            currentWordID = existingWord.wordID;
        } else {
            // Nếu chưa có, tạo từ mới trong bảng Word
            const { data: newWord, error: wordError } = await supabase
                .from('Word')
                .insert([{ term: newTerm, definition: newDefinition }])
                .select('wordID')
                .single();
            if (wordError) throw wordError;
            currentWordID = newWord.wordID;
        }

        // 3. Liên kết từ mới vào User_Word cho user
        const { error: linkError } = await supabase
            .from('User_Word')
            .insert([{ userID, wordID: currentWordID, photoUrl: newPhotoUrl }]);
            
        if (linkError) throw linkError;

        res.status(200).json({ success: true, message: "Cập nhật từ thành công!" });
    } catch (err) {
        console.error("Lỗi cập nhật từ:", err);
        res.status(500).json({ success: false, message: "Lỗi hệ thống: " + err.message });
    }
});


module.exports = router;