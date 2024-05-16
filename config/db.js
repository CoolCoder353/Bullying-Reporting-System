const mysql = require('mysql');
const path = require('path');
const logger = require(path.join(process.cwd(), 'middleware', 'logger'));
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bully',
    port: 3307 // default port for MariaDB is 3306 but some servers use 3307
});

pool.getConnection((err, conn) => {
    if (err) {
        logger.error('Error connecting to the database: ', err);
        process.exit(1);
    } else {
        logger.info('Connected to the database');
        conn.release(); // release the connection back to the pool
    }
});

module.exports = pool;