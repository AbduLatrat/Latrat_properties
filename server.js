const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const { exec } = require('child_process');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
