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
            .eq('definition', definition)
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

module.exports = router;