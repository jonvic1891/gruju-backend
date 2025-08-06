"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
// import DatabaseConnection from './config/database'; // Disabled for demo
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const children_1 = __importDefault(require("./routes/children"));
const activities_1 = __importDefault(require("./routes/activities"));
const calendar_1 = __importDefault(require("./routes/calendar"));
const connections_1 = __importDefault(require("./routes/connections"));
const admin_1 = __importDefault(require("./routes/admin"));
const sms_1 = __importDefault(require("./routes/sms"));
const database_1 = __importDefault(require("./routes/database"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3001'
        ];
        // Allow file:// protocol for local HTML files
        if (origin.startsWith('file://') || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(null, true); // Allow all for development
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Basic health check route
app.get('/health', async (req, res) => {
    res.json({
        status: 'OK',
        message: 'Parent Activity App API is running (Demo Mode)',
        database: 'mock-database'
    });
});
// API Routes
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/children', children_1.default);
app.use('/api/activities', activities_1.default);
app.use('/api/calendar', calendar_1.default);
app.use('/api/connections', connections_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/sms', sms_1.default);
app.use('/api/database', database_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Parent Activity App API is running on port ${PORT}`);
    console.log(`📊 Using mock database for demo purposes`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
