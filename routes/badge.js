var express = require('express');
var router = express.Router();
const supabase = require('../db');


// --- QUẢN LÝ HUY HIỆU (BADGE) ---
router.post('admin/add', async (req, res) => {
    const { badgeName, description, category, type, adminID } = req.body;
    const { data, error } = await supabase.from('Badge').insert([{ badgeName, description, category, type, AdminID: adminID }]);
    res.json(data);
});

router.get('admin/select', async (req, res) => {
    const { data } = await supabase.from('Badge').select('*');
    res.json(data);
});

// Lấy các huy hiệu đã sở hữu của một user
router.get('student/:studentID', async (req, res) => {
    const { data, error } = await supabase
        .from('Student_Badge')
        .select('Badge(*)')
        .eq('studentID', req.params.studentID);
    res.json(data);
});



module.exports = router;