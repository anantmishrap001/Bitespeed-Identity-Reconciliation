const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('MySQL connection failed:', err.message);
  } else {
    console.log('Connected to MySQL database.');
    connection.release();
  }
});

module.exports = db;
