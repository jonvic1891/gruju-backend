"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Basic test route
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Test server is running!',
        timestamp: new Date().toISOString()
    });
});
// Test auth route
app.post('/test-register', (req, res) => {
    const { username, email } = req.body;
    res.json({
        success: true,
        message: 'Test registration endpoint working',
        data: { username, email }
    });
});
app.listen(PORT, () => {
    console.log(`🧪 Test server running on port ${PORT}`);
    console.log(`🔗 Try: http://localhost:${PORT}/health`);
});
