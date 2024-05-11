const mysql = require('mysql');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bully'
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database: ', err);
        process.exit(1);
    } else {
        console.log('Connected to the database');
    }
});

module.exports = db;