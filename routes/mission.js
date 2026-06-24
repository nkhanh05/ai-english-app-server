var express = require('express');
var router = express.Router();
const supabase = require('../db');

// Lấy các nhiệm vụ của một user (bảng Student_Mission)
router.get('student/:studentID', async (req, res) => {
    const { data, error } = await supabase
        .from('Student_Mission')
        .select('Mission(*), status, progress')
        .eq('studentID', req.params.studentID);
    res.json(data);
});
// --- QUẢN LÝ NHIỆM VỤ (MISSION) ---
router.post('admin/add', async (req, res) => {
    const { missionName, description, type, adminID } = req.body;
    const { data, error } = await supabase.from('Mission').insert([{ missionName, description, type, AdminID: adminID }]);
    error ? res.status(400).json({ error: error.message }) : res.status(201).json(data);
});

router.get('admin/select', async (req, res) => {
    const { data, error } = await supabase.from('Mission').select('*');
    res.json(data);
});

router.put('admin/update/:id', async (req, res) => {
    const { data, error } = await supabase.from('Mission').update(req.body).eq('missionID', req.params.id);
    res.json(data);
});

router.delete('admin/delete/:id', async (req, res) => {
    const { error } = await supabase.from('Mission').delete().eq('missionID', req.params.id);
    res.status(204).send();
});

module.exports = router;