const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

let lastQR = '';
let isConnected = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    }
});

// QR save karo
client.on('qr', (qr) => {
    lastQR = qr;
    console.log('QR Ready! Browser me dekho: http://localhost:3000/qr');
});

client.on('ready', () => {
    isConnected = true;
    console.log('✅ WhatsApp Connected!');
});

client.on('disconnected', () => {
    isConnected = false;
    console.log('❌ Disconnected!');
});

// QR browser me dikhao
app.get('/qr', async (req, res) => {
    if (isConnected) return res.send('<h2>✅ WhatsApp Already Connected!</h2>');
    if (!lastQR) return res.send('<h2>⏳ QR Loading... 10 sec baad refresh karo</h2>');
    
    const img = await qrcode.toDataURL(lastQR);
    res.send(`
        <h2>WhatsApp QR Scan Karo</h2>
        <img src="${img}" style="width:300px"/>
        <p>WhatsApp → Linked Devices → Link a Device</p>
        <script>setTimeout(()=>location.reload(), 30000)</script>
    `);
});

// Message bhejne ka API
app.post('/smsapi', async (req, res) => {
    const { number, message } = req.body;
    
    if (!isConnected) {
        return res.json({ success: false, error: 'WhatsApp connected nahi hai!' });
    }
    
    try {
        const chatId = `91${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.json({ success: true, message: `Message bhej diya ${number} ko!` });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get('/smsapi', async (req, res) => {
    const { number, message } = req.query;
    if (!number || !message) return res.json({ success: false, error: 'number aur message dono chahiye' });
    if (!isConnected) return res.json({ success: false, error: 'WhatsApp connected nahi!' });
    try {
        const chatId = `91${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.json({ success: true, message: `Bhej diya ${number} ko!` });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

client.initialize();

// Naya - cPanel ke liye
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server started on port ' + PORT));
