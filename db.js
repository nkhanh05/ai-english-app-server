// db.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Lấy biến môi trường (Render sẽ tự động đọc các biến này khi deploy)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY; // Dùng Secret Key cho Backend

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SECRET_KEY");
    process.exit(1);
}

// Khởi tạo Supabase Client
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Đã kết nối Supabase Database thành công!');

module.exports = supabase;