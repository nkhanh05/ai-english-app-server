
require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// ========================================================
// 1. THÊM THƯ VIỆN SQL SERVER VÀ ĐỌC BIẾN MÔI TRƯỜNG
// ========================================================
var sql = require('mssql');




var userRouter = require('./routes/user');
var relationshipRouter = require('./routes/relationship');
var wordRouter = require('./routes/word');


var app = express();

// ========================================================
// 2. CẤU HÌNH KẾT NỐI DATABASE VỚI BIẾN CỦA AZURE
// ========================================================
const dbConfig = {
    // Azure sẽ tự động lấy giá trị bạn đã điền ở Environment variables
    // Nếu không có (chạy local), nó sẽ dùng chuỗi dự phòng ở đằng sau
    connectionString: process.env.DB_CONNECTION_STRING || "Server=localhost;Database=ai_english_app_db;Trusted_Connection=True;"
};

// Thực hiện kết nối
sql.connect(dbConfig)
    .then(() => console.log('✅ Đã kết nối Database trên Cloud thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối Database:', err));
// ========================================================

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/user', userRouter);
app.use('/api/relationship', relationshipRouter);
app.use('/api/word', wordRouter);




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;