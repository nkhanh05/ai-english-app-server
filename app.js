// app.js
require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

require('./db'); // Khởi tạo kết nối Supabase

// Đã mở comment và thêm đầy đủ các Router
var userRouter = require('./routes/user');
var relationshipRouter = require('./routes/relationship');
var wordRouter = require('./routes/word');
var studentRouter = require('./routes/student'); 
var exerciseRouter = require('./routes/exercise'); 
var missionRouter = require('./routes/mission'); 
var badgeRouter = require('./routes/badge');

var app = express();

// view engine setup (Có thể bỏ qua nếu bạn chỉ làm API thuần)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Đăng ký các đường dẫn API
app.use('/api/user', userRouter);
app.use('/api/relationship', relationshipRouter);
app.use('/api/word', wordRouter);
app.use('/api/student', studentRouter);
app.use('/api/exercise', exerciseRouter);
app.use('/api/mission', missionRouter);
app.use('/api/badge', badgeRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler (Đã sửa lại để trả về JSON thay vì tìm trang HTML)
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.json({ 
    success: false, 
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

module.exports = app;