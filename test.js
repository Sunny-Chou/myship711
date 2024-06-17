const crypto = require('crypto');
const { Pool } = require('pg');
const pool = new Pool({
    user: "sunnychou",
    host: "dpg-cpjee96ct0pc7388mks0-a.singapore-postgres.render.com",
    database: "myship711",
    password: "Tou4osCtlyqH74xHn1OHrjgANrpRhAa0",
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});
async function connectDatabase() {
    const client = await pool.connect();
    return client;
}

async function query(client, sql, params) {
    const { rows } = await client.query(sql, params);
    return rows;
}
// 生成隨機鹽值
function generateSalt(length) {
    return crypto.randomBytes(length).toString('hex');
}

// 使用 SHA-256 和鹽值來哈希密碼
function hashPassword(password, salt) {
    return crypto.createHash('sha256').update(password + salt).digest('hex');
}



// 示例用法
const plaintextPassword = 'teacher';
const salt = generateSalt(16);  // 生成16字節的鹽值
const hashedPassword = hashPassword(plaintextPassword, salt);

console.log('Salt:', salt);
console.log('Hashed Password:', hashedPassword);
async function a(){
const db = await connectDatabase();
await query(db, 'insert into 客服 values ($1,$2,$3)', [plaintextPassword,hashedPassword,salt]);
db.release();
}
a();