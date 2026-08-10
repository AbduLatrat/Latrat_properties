const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// serve uploaded images directory
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir);
app.use('/images', express.static(imagesDir));

// multer for uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, imagesDir); },
    filename: function (req, file, cb) { const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_'); cb(null, safe); }
});
const upload = multer({ storage });

const PORT = process.env.PORT || 3000;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'latifyiga193@gmail.com';

// Setup nodemailer transport (SMTP)
function makeTransport() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;
    return nodemailer.createTransport({ host, port, secure: port===465, auth: { user, pass } });
}

app.post('/book', async (req, res) => {
    const body = req.body || {};
    const { name, email, phone, property, message, page } = body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Missing fields' });

    const transport = makeTransport();
    const html = `
        <h3>New booking / enquiry</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Property:</strong> ${property || '-'}</p>
        <p><strong>Page:</strong> ${page || ''}</p>
        <p><strong>Message:</strong><br/>${message.replace(/\n/g,'<br/>')}</p>
    `;

    if (!transport) {
        // fallback: write to a file and return success (so form still works offline)
        console.warn('SMTP not configured; writing booking to bookings.log');
        const fs = require('fs');
        const entry = `[${new Date().toISOString()}] ${name} <${email}> ${phone} ${property}\n${message}\n\n`;
        fs.appendFileSync('bookings.log', entry);
        return res.json({ result: 'saved-local' });
    }

    try {
        const info = await transport.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: ADMIN_EMAIL,
            subject: `New booking from ${name}`,
            html
        });
        res.json({ result: 'sent', info: info.response || info.messageId });
    } catch (err) {
        console.error('sendMail failed', err);
        res.status(500).json({ error: 'email_failed' });
    }
});

    // Image upload endpoint
    app.post('/upload', upload.array('images', 20), (req, res) => {
        if (!req.files || !req.files.length) return res.status(400).json({ error: 'no_files' });
        const urls = req.files.map(f => `/images/${f.filename}`);
        res.json({ files: urls });
    });

// Sync endpoint: runs git add/commit/push. Run only from project folder.
app.post('/sync', (req, res) => {
    const body = req.body || {};
    const message = body.message || `site sync ${new Date().toISOString()}`;
    // optional token protection
    const token = process.env.SYNC_TOKEN;
    if (token) {
        const provided = req.headers['x-sync-token'] || '';
        if (provided !== token) return res.status(401).json({ error: 'unauthorized' });
    }

    // sequence: add, commit, push
    exec('git add -A && git commit -m "' + message.replace(/"/g, '\\"') + '" || true && git push -u origin HEAD:main', { maxBuffer: 1024*1024 }, (err, stdout, stderr) => {
        if (err) {
            return res.status(500).json({ error: 'git_failed', details: stderr || err.message });
        }
        res.json({ result: stdout || 'pushed' });
    });
});

// Save packages to packages.json and commit & push
app.post('/save-packages', (req, res) => {
    const packages = req.body;
    if (!packages) return res.status(400).json({ error: 'missing_packages' });
    const token = process.env.SYNC_TOKEN;
    if (token) {
        const provided = req.headers['x-sync-token'] || '';
        if (provided !== token) return res.status(401).json({ error: 'unauthorized' });
    }
    try {
        const filePath = path.join(__dirname, 'packages.json');
        fs.writeFileSync(filePath, JSON.stringify(packages, null, 2), 'utf8');
        const message = `Update packages ${new Date().toISOString()}`;
        exec('git add packages.json && git commit -m "' + message.replace(/"/g, '\\"') + '" || true && git push -u origin HEAD:main', { maxBuffer: 1024*1024 }, (err, stdout, stderr) => {
            if (err) return res.status(500).json({ error: 'git_failed', details: stderr || err.message });
            res.json({ result: 'saved', git: stdout || 'pushed' });
        });
    } catch (e) {
        res.status(500).json({ error: 'write_failed', details: e.message });
    }
});

// Serve packages.json if available
app.get('/packages', (req, res) => {
    const filePath = path.join(__dirname, 'packages.json');
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'not_found' });
    try { const data = fs.readFileSync(filePath, 'utf8'); res.setHeader('Content-Type','application/json'); res.send(data); } catch (e) { res.status(500).json({ error: 'read_failed' }); }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
