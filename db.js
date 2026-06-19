const sql = require('mssql');

// Tách nhỏ chuỗi kết nối ra thành các thuộc tính cụ thể
const dbConfig = {
    user: 'nkhanh',
    password: 'Nkh060905@',
    server: 'nkhanh.database.windows.net', 
    database: 'ai-english-app-db',
    options: {
        encrypt: true, // Bắt buộc cho Azure SQL
        trustServerCertificate: false
    },
    connectionTimeout: 30000
};

// Khởi tạo và kết nối
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Đã kết nối Database thành công!');
        return pool;
    })
    .catch(err => {
        console.error('❌ LỖI KẾT NỐI DATABASE:', err);
        throw err; // Ném lỗi để user.js biết mà xử lý
    });

module.exports = {
    sql,
    poolPromise
};