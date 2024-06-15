const express = require('express');
const crypto = require('crypto');
const WebSocket = require('ws');
const ServerSocket = WebSocket.Server;
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const PORT = process.env.PORT || 80;
const app = express();
require('dotenv').config();
app.use(express.static('public'));
const { Pool } = require('pg');
const axios = require('axios');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const TYPE = { BLOB: 'blob', TREE: 'tree' };
const COMMITS_URL = `https://api.github.com/repos/${GITHUB_REPO}/git/commits`;
const REPOSITORY_TREES_URL = `https://api.github.com/repos/${GITHUB_REPO}/git/trees`;
const BRANCH_NAME = "main";
const REF_URL = `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${BRANCH_NAME}`;
const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `Bearer ${GITHUB_TOKEN}`,
};

async function deleteGitHubFolderRecursive(FOLDER_TO_DELETE) {
    try {
        const { data: { object: { sha: currentCommitSha } } } = await axios({ url: REF_URL, headers });
        const COMMIT_URL = `${COMMITS_URL}/${currentCommitSha}`;
        const { data: { tree: { sha: treeSha } } } = await axios({ url: COMMIT_URL, headers });
        const { data: { tree: oldTree } } = await axios({
            url: `${REPOSITORY_TREES_URL}/${BRANCH_NAME}:${FOLDER_TO_DELETE}`,
            headers,
            params: { recursive: true },
        });
        const newTree = oldTree
            .filter(({ type }) => type === TYPE.BLOB)
            .map(({ path, mode, type }) => (
                { path: `${FOLDER_TO_DELETE}/${path}`, sha: null, mode, type }
            ));

        const { data: { sha: newTreeSha } } = await axios({
            url: REPOSITORY_TREES_URL,
            method: 'POST',
            headers,
            data: {
                base_tree: treeSha,
                tree: newTree,
            },
        });
        const { data: { sha: newCommitSha } } = await axios({
            url: COMMITS_URL,
            method: 'POST',
            headers,
            data: {
                message: 'Committing with GitHub\'s API :fire:',
                tree: newTreeSha,
                parents: [currentCommitSha],
            },
        });
        await axios({
            url: REF_URL,
            method: 'POST',
            headers,
            data: { sha: newCommitSha },
        });
    } catch (err) {

    }
}

const pool = new Pool({
    user: process.env.user,
    host: process.env.host,
    database: process.env.database,
    password: process.env.password,
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});
const server = app.listen(PORT, () => console.log(`[Server] Listening on https://localhost:${PORT}`));
const wss = new ServerSocket({ server });
async function connectDatabase() {
    const client = await pool.connect();
    return client;
}

async function query(client, sql, params) {
    const { rows } = await client.query(sql, params);
    return rows;
}
function generateToken(userId) {
    const payload = { userId };
    const token = jwt.sign(payload, '第二組是彭彭和周周', { expiresIn: '9h' });
    return token;
}

wss.on('connection', (ws, req) => {
    ws.on('message', async data => {
        data = JSON.parse(data.toString());
        console.log(`[Message from client ${ws.id}] data: `, data);
        if (data.type === "sevicerlogin") {
            const md5Hash = crypto.createHash('md5').update(data.password).digest('hex');
            let db = await connectDatabase();
            try {
                const results = await query(db, 'SELECT * FROM 客服 WHERE 客服id = $1 AND 密碼 = $2', [data.userId, md5Hash]);
                if (results[0]) {
                    ws.send(JSON.stringify({ type: "sevicerlogin", success: true, userId: generateToken(data.userId) }));
                    ws.admin = true;
                } else {
                    ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: '帳號密碼錯誤！' }));
                }
            } catch (error) {
                ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: '連線資料庫時出現錯誤' }));
            } finally {
                if (db.release) {
                    db.release();
                }
            }
        } else if (data.type === "clientlogin") {
            let clientId = data.userId || uuidv4();
            const db = await connectDatabase();
            try {
                var results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [clientId]);
                if (results[0]) {
                    ws.send(JSON.stringify({ type: "updateuserId", success: true, userId: clientId }));
                    Array.from(wss.clients).filter(item => item.admin == true).forEach((client) => {
                        client.send(JSON.stringify({ type: "update", op: "更新", client: { id: clientId, online: true } }));
                    });
                    results = await query(db, 'SELECT * FROM 聊天內容 WHERE 聊天室id = $1', [clientId]);
                    for (const r of results) {
                        if (r['訊息種類id'] == 0) {
                            ws.send(JSON.stringify({ type: "updatetext", success: true, text: r['訊息'], sender: r['發送者'] }));
                        } else if (r['訊息種類id'] == 1) {
                            ws.send(JSON.stringify({
                                success: true,
                                type: "updatefile",
                                url: `http://myship7-11.myvnc.comhttps://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/file/${r['聊天室id']}/${r['訊息']}`,
                                filename: r['訊息'],
                                sender: r['發送者']
                            }));
                        } else if (r['訊息種類id'] == 2) {
                            ws.send(JSON.stringify({
                                success: true,
                                type: "updateimg",
                                url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/img/${r['聊天室id']}/${r['訊息']}`,
                                sender: r['發送者']
                            }));
                        } else if (r['訊息種類id'] == 3) {
                            ws.send(JSON.stringify({
                                success: true,
                                type: "updaterecord",
                                url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/record/${r['聊天室id']}/${r['訊息']}`,
                                sender: r['發送者']
                            }));
                        }
                    }
                } else {
                    do {
                        clientId = uuidv4();
                    } while (results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [clientId])[0]);
                    ws.send(JSON.stringify({ type: "updateuserId", success: true, userId: clientId }));
                }
            } catch (error) {
                ws.send(JSON.stringify({ type: "updateuserId", success: false, message: '連線時出現錯誤' }));
            } finally {
                if (db.release) {
                    db.release();
                }
            }
            ws.admin = false;
            ws.id = clientId;
        } else if (data.type === "sendtext") {
            if (data.id) {
                const db = await connectDatabase();
                try {
                    let results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                    if (!results[0]) {
                        if (ws.id == data.id) {
                            await query(db, 'INSERT INTO 聊天室 (聊天室id) VALUES ($1)', [data.id]);
                            Array.from(wss.clients).filter(item => item.admin == true).forEach((client) => {
                                client.send(JSON.stringify({ type: "update", op: "新增", client: { id: data.id, online: true, sevicer: "" } }));
                            });
                        } else {
                            if (ws.admin)
                                ws.send(JSON.stringify({ type: "transfer.html", success: false, message: '客戶已不存在' }));
                            else
                                ws.send(JSON.stringify({ type: "index.html", success: false, message: '連線時出現錯誤' }));
                            return;
                        }
                    }
                    results = await query(db, 'SELECT * FROM 聊天內容 WHERE 聊天室id = $1', [data.id]);
                    const count = results.length || 0;
                    await query(db, 'INSERT INTO 聊天內容 (聊天內容id, 聊天室id, 訊息種類id, 訊息, 發送者) VALUES ($1,$2,$3,$4,$5)', [count, data.id, 0, data.text, data.sender]);
                    ws.send(JSON.stringify({ type: "updatetext", success: true, text: data.text, sender: data.sender }));
                    if (data.sender == 0) {
                        results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                        if (results[0]['客服id']) {
                            Array.from(wss.clients).filter(item => item.id == results[0]['客服id']).forEach((client) => {
                                client.send(JSON.stringify({ type: "updatetext", success: true, text: data.text, sender: data.sender }));
                            });
                        }
                    } else if (data.sender == 1) {
                        Array.from(wss.clients).filter(item => item.id == data.id).forEach((client) => {
                            client.send(JSON.stringify({ type: "updatetext", success: true, text: data.text, sender: data.sender }));
                        });
                    }
                } catch (error) {
                    ws.send(JSON.stringify({ type: "updatetext", success: false, message: '連線時出現錯誤' }));
                } finally {
                    if (db.release) {
                        db.release();
                    }
                }
            }
        } else if (data.type === "sendfile") {
            if (data.id) {
                const dirPath = `public/file/${data.id}`;
                const encodef = data.filecontent.match(/;([^,]+)/)[1];
                const file = data.filecontent.split(',')[1];
                const filePath = `${dirPath}/${data.filename}`;
                if (encodef != "base64") {
                    file = Buffer.from(file, encodef).toString('base64');
                }
                try {
                    await axios.put(
                        `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
                        {
                            message: '上傳檔案',
                            content: file
                        },
                        {
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                } catch (error) {
                }
                const db = await connectDatabase();
                try {
                    let results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                    if (!results[0]) {
                        if (ws.id == data.id) {
                            await query(db, 'INSERT INTO 聊天室 (聊天室id) VALUES ($1)', [data.id]);
                            Array.from(wss.clients).filter(item => item.admin == true).forEach((client) => {
                                client.send(JSON.stringify({ type: "update", op: "新增", client: { id: data.id, online: true, sevicer: "" } }));
                            });
                        } else {
                            if (ws.admin)
                                ws.send(JSON.stringify({ type: "transfer.html", success: false, message: '客戶已不存在' }));
                            else
                                ws.send(JSON.stringify({ type: "index.html", success: false, message: '連線時出現錯誤' }));
                            return;
                        }
                    }
                    results = await query(db, 'SELECT * FROM 聊天內容 WHERE 聊天室id = $1', [data.id]);
                    const count = results.length;
                    await query(db, 'INSERT INTO 聊天內容 (聊天內容id, 聊天室id, 訊息種類id, 訊息, 發送者) VALUES ($1, $2, $3, $4, $5)', [count, data.id, 1, data.filename, data.sender]);
                    ws.send(JSON.stringify({
                        success: true,
                        type: "updatefile",
                        url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/file/${data.id}/${data.filename}`,
                        filename: data.filename,
                        sender: data.sender
                    }));
                    if (data.sender == 0) {
                        results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                        if (results[0]['客服id']) {
                            Array.from(wss.clients).filter(item => item.id == results[0]['客服id']).forEach((client) => {
                                client.send(JSON.stringify({
                                    success: true,
                                    type: "updatefile",
                                    url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/file/${data.id}/${data.filename}`,
                                    filename: data.filename,
                                    sender: data.sender
                                }));
                            });
                        }
                    } else if (data.sender == 1) {
                        Array.from(wss.clients).filter(item => item.id == data.id).forEach((client) => {
                            client.send(JSON.stringify({
                                success: true,
                                type: "updatefile",
                                url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/file/${data.id}/${data.filename}`,
                                filename: data.filename,
                                sender: data.sender
                            }));
                        });
                    }
                } catch (error) {
                    ws.send(JSON.stringify({ type: "updatefile", success: false, message: '上傳檔案時出現錯誤' }));
                } finally {
                    if (db.release) {
                        db.release();
                    }
                }
            }
        } else if (data.type === "sendimg") {
            if (data.id) {
                const imgname = new Date().getTime();
                const dirPath = `public/img/${data.id}`;
                const format = data.img.match(/\/([^;]+)/)[1];
                const encodef = data.img.match(/;([^,]+)/)[1];
                const img = data.img.split(',')[1];
                const filePath = `${dirPath}/${imgname}.${format}`;
                if (encodef != "base64") {
                    img = Buffer.from(img, encodef).toString('base64');
                }
                try {
                    await axios.put(
                        `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
                        {
                            message: '上傳圖片',
                            content: img
                        },
                        {
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                } catch (error) {
                }
                const db = await connectDatabase();
                try {
                    let results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                    if (!results[0]) {
                        if (ws.id == data.id) {
                            await query(db, 'INSERT INTO 聊天室 (聊天室id) VALUES ($1)', [data.id]);
                            Array.from(wss.clients).filter(item => item.admin == true).forEach((client) => {
                                client.send(JSON.stringify({ type: "update", op: "新增", client: { id: data.id, online: true, sevicer: "" } }));
                            });
                        } else {
                            if (ws.admin)
                                ws.send(JSON.stringify({ type: "transfer.html", success: false, message: '客戶已不存在' }));
                            else
                                ws.send(JSON.stringify({ type: "index.html", success: false, message: '連線時出現錯誤' }));
                            return;
                        }
                    }

                    results = await query(db, 'SELECT * FROM 聊天內容 WHERE 聊天室id = $1', [data.id]);
                    const count = results.length;
                    await query(db, 'INSERT INTO 聊天內容 (聊天內容id, 聊天室id, 訊息種類id, 訊息, 發送者) VALUES ($1, $2, $3, $4, $5)', [count, data.id, 2, `${imgname}.${format}`, data.sender]);
                    ws.send(JSON.stringify({
                        success: true,
                        type: "updateimg",
                        url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/img/${data.id}/${imgname}.${format}`,
                        sender: data.sender
                    }));
                    if (data.sender == 0) {
                        results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                        if (results[0]['客服id']) {
                            Array.from(wss.clients).filter(item => item.id == results[0]['客服id']).forEach((client) => {
                                client.send(JSON.stringify({
                                    success: true,
                                    type: "updateimg",
                                    url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/img/${data.id}/${imgname}.${format}`,
                                    sender: data.sender
                                }));
                            });
                        }
                    } else if (data.sender == 1) {
                        Array.from(wss.clients).filter(item => item.id == data.id).forEach((client) => {
                            client.send(JSON.stringify({
                                success: true,
                                type: "updateimg",
                                url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/img/${data.id}/${imgname}.${format}`,
                                sender: data.sender
                            }));
                        });
                    }
                } catch (error) {
                    ws.send(JSON.stringify({ type: "updateimg", success: false, message: '上傳圖片時出現錯誤' }));
                } finally {
                    if (db.release) {
                        db.release();
                    }
                }
            }
        } else if (data.type === "sendrecord") {
            if (data.id) {
                const recordname = new Date().getTime();
                const dirPath = `public/record/${data.id}`;
                const filePath = `${dirPath}/${recordname}.opus`;
                try {
                    await axios.put(
                        `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
                        {
                            message: '上傳錄音',
                            content: data.record
                        },
                        {
                            headers: {
                                'Authorization': `token ${GITHUB_TOKEN}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                } catch (error) {
                }
                const db = await connectDatabase();
                try {
                    let results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                    if (!results[0]) {
                        if (ws.id == data.id) {
                            await query(db, 'INSERT INTO 聊天室 (聊天室id) VALUES ($1)', [data.id]);
                            Array.from(wss.clients).filter(item => item.admin == true).forEach((client) => {
                                client.send(JSON.stringify({ type: "update", op: "新增", client: { id: data.id, online: true, sevicer: "" } }));
                            });
                        } else {
                            if (ws.admin)
                                ws.send(JSON.stringify({ type: "transfer.html", success: false, message: '客戶已不存在' }));
                            else
                                ws.send(JSON.stringify({ type: "index.html", success: false, message: '連線時出現錯誤' }));
                            return;
                        }
                    }
                    results = await query(db, 'SELECT * FROM 聊天內容 WHERE 聊天室id = $1', [data.id]);
                    const count = results.length;
                    await query(db, 'INSERT INTO 聊天內容 (聊天內容id, 聊天室id, 訊息種類id, 訊息, 發送者) VALUES ($1, $2, $3, $4, $5)', [count, data.id, 3, `${recordname}.opus`, data.sender]);
                    ws.send(JSON.stringify({
                        success: true,
                        type: "updaterecord",
                        url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/record/${data.id}/${recordname}.opus`,
                        sender: data.sender
                    }));
                    if (data.sender == 0) {
                        results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                        if (results[0]['客服id']) {
                            Array.from(wss.clients).filter(item => item.id == results[0]['客服id']).forEach((client) => {
                                client.send(JSON.stringify({
                                    success: true,
                                    type: "updaterecord",
                                    url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/record/${data.id}/${recordname}.opus`,
                                    sender: data.sender
                                }));
                            });
                        }
                    } else if (data.sender == 1) {
                        Array.from(wss.clients).filter(item => item.id == data.id).forEach((client) => {
                            client.send(JSON.stringify({
                                success: true,
                                type: "updaterecord",
                                url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/record/${data.id}/${recordname}.opus`,
                                sender: data.sender
                            }));
                        });
                    }
                } catch (error) {
                    ws.send(JSON.stringify({ type: "updateimg", success: false, message: '上傳圖片時出現錯誤' }));
                } finally {
                    if (db.release) {
                        db.release();
                    }
                }
            }
        } else if (data.type === "getclient") {
            jwt.verify(data.userId, '第二組是彭彭和周周', async (err, decoded) => {
                if (err) {
                    ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: "登入逾時，請重新登入" }));
                } else {
                    ws.id = decoded.userId;
                    const db = await connectDatabase();
                    try {
                        var results = await query(db, 'SELECT * FROM 客服 WHERE 客服id = $1', [ws.id]);
                        if (results[0]) {
                            var clientlist = [];
                            results = await query(db, 'SELECT * FROM 聊天室;');
                            for (const r of results) {
                                const temp = Array.from(wss.clients).filter(item => item.id == r['聊天室id']);
                                if (r['客服id'] == ws.id && temp[0]) {
                                    clientlist.push({ id: r['聊天室id'], online: true, sevicer: r['客服id'] });
                                } else if (r['客服id'] == ws.id) {
                                    clientlist.push({ id: r['聊天室id'], online: false, sevicer: r['客服id'] });
                                } else if (temp[0]&&r['客服id']==null) {
                                    clientlist.push({ id: r['聊天室id'], online: true, sevicer: "" });
                                } else if(r['客服id']==null){
                                    clientlist.push({ id: r['聊天室id'], online: false, sevicer: "" });
                                }
                            }
                            ws.send(JSON.stringify({ type: "getclient", success: true, clients: clientlist }));
                            ws.admin = true;
                        } else {
                            ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: "登入逾時，請重新登入" }));
                        }
                    } catch (error) {
                        ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: "連線資料庫時出現錯誤" }));
                    } finally {
                        if (db.release) {
                            db.release();
                        }
                    }
                }
            });
        } else if (data.type == "transfer") {
            jwt.verify(data.userId, '第二組是彭彭和周周', async (err, decoded) => {
                if (err) {
                    ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: "登入逾時，請重新登入" }));
                } else {
                    ws.id = decoded.userId;
                    const db = await connectDatabase();
                    try {
                        var results = await query(db, 'SELECT * FROM 客服 WHERE 客服id = $1', [ws.id]);
                        if (results[0]) {
                            results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                            if (results[0]) {
                                if (!results[0]['客服id']) {
                                    await query(db, 'UPDATE 聊天室 SET 客服id=$1 WHERE 聊天室id = $2', [ws.id, data.id]);
                                    Array.from(wss.clients).filter(item => item.admin == true).forEach(client => {
                                        if (client.id == ws.id) {
                                            client.send(JSON.stringify({ type: "update", op: "更新", client: { id: data.id, sevicer: ws.id } }));
                                        } else {
                                            client.send(JSON.stringify({ type: "update", op: "刪除", client: { id: data.id } }));
                                        }
                                    });
                                } else if (results[0]['客服id'] != ws.id) {
                                    ws.send(JSON.stringify({ type: "update", op: "刪除", client: { id: data.id } }));
                                    return;
                                }
                                results = await query(db, 'SELECT * FROM 聊天內容 WHERE 聊天室id = $1', [data.id]);
                                for (const r of results) {
                                    if (r['訊息種類id'] == 0) {
                                        ws.send(JSON.stringify({ type: "updatetext", success: true, text: r['訊息'], sender: r['發送者'] }));
                                    } else if (r['訊息種類id'] == 1) {
                                        ws.send(JSON.stringify({
                                            success: true,
                                            type: "updatefile",
                                            url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/file/${r['聊天室id']}/${r['訊息']}`,
                                            filename: r['訊息'],
                                            sender: r['發送者']
                                        }));
                                    } else if (r['訊息種類id'] == 2) {
                                        ws.send(JSON.stringify({
                                            success: true,
                                            type: "updateimg",
                                            url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/img/${r['聊天室id']}/${r['訊息']}`,
                                            sender: r['發送者']
                                        }));
                                    } else if (r['訊息種類id'] == 3) {
                                        ws.send(JSON.stringify({
                                            success: true,
                                            type: "updaterecord",
                                            url: `https://raw.githubusercontent.com/Sunny-Chou/myship711/main/public/record/${r['聊天室id']}/${r['訊息']}`,
                                            sender: r['發送者']
                                        }));
                                    }
                                }
                                ws.admin = true;
                            } else {
                                ws.send(JSON.stringify({ type: "transfer.html", success: false, message: '客戶已不存在' }));
                            }
                        } else {
                            ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: '登入逾時，請重新登入' }));
                        }
                    } catch (error) {
                        ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: '連線資料庫時出現錯誤' }));
                    } finally {
                        if (db.release) {
                            db.release();
                        }
                    }
                }
            });
        } else if (data.type == "deleteClient") {
            jwt.verify(data.userId, '第二組是彭彭和周周', async (err, decoded) => {
                if (err) {
                    ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: "登入逾時，請重新登入" }));
                } else {
                    ws.id = decoded.userId;
                    const db = await connectDatabase();
                    try {
                        var results = await query(db, 'SELECT * FROM 客服 WHERE 客服id = $1', [ws.id]);
                        if (results[0]) {
                            results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [data.id]);
                            if (results[0]) {
                                await query(db, 'DELETE FROM 聊天內容 WHERE 聊天室id = $1;', [data.id]);
                                await query(db, 'DELETE FROM 聊天室 WHERE 聊天室id = $1;', [data.id]);
                                await deleteGitHubFolderRecursive(`public/img/${data.id}`);
                                await deleteGitHubFolderRecursive(`public/file/${data.id}`);
                                await deleteGitHubFolderRecursive(`public/record/${data.id}`);
                                Array.from(wss.clients).filter(item => item.admin == true || item.id == data.id).forEach((client) => {
                                    client.send(JSON.stringify({ type: "update", op: "刪除", client: { id: data.id } }));
                                });
                            } else {
                                ws.send(JSON.stringify({ type: "transfer.html", success: false, message: '客戶已不存在' }));
                            }
                        } else {
                            ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: '登入逾時，請重新登入' }));
                        }
                    } catch (error) {
                        ws.send(JSON.stringify({ type: "cslogin.html", success: false, message: '連線資料庫時出現錯誤' }));
                    } finally {
                        if (db.release) {
                            db.release();
                        }
                    }
                }
            });
        }
    });

    ws.on('close', async () => {
        if (ws.admin == false) {
            const db = await connectDatabase();
            try {
                var results = await query(db, 'SELECT * FROM 聊天室 WHERE 聊天室id = $1', [ws.id]);
                if (results[0]) {
                    Array.from(wss.clients).filter(item => item.admin == true).forEach((client) => {
                        client.send(JSON.stringify({ type: "update", op: "更新", client: { id: ws.id, online: false } }));
                    });
                }
            } catch (error) {

            } finally {
                if (db.release) {
                    db.release();
                }
            }
        }
    });
});
