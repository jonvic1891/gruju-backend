const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve admin panels
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-multi-environment-panel.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-multi-environment-panel.html'));
});

app.get('/database-admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-database-panel.html'));
});

app.get('/demo', (req, res) => {
    res.sendFile(path.join(__dirname, 'ParentActivityApp', 'demo.html'));
});

app.listen(PORT, () => {
    console.log(`🎛️ Admin Panel Server running on http://localhost:${PORT}`);
    console.log(`🌐 Multi-Environment Admin: http://localhost:${PORT}/admin`);
    console.log(`🗄️ Database Admin: http://localhost:${PORT}/database-admin`);
    console.log(`🎮 Demo App: http://localhost:${PORT}/demo`);
    console.log(`📖 Guides available in the project directory`);
});