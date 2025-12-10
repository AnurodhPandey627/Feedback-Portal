const mysql = require('mysql2/promise');

async function initDB() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'school_system',
    password: 'admin'
  });

  //console.log('Connected to MySQL!');
  return connection;
}

module.exports = initDB;
