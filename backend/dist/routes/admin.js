"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const databaseService_1 = __importDefault(require("../services/databaseService"));
const adminAuth_1 = require("../middleware/adminAuth");
const router = express_1.default.Router();
// Apply authentication and admin middleware to all routes
router.use(adminAuth_1.enhancedAuthMiddleware);
router.use(adminAuth_1.requireAdmin);
// GET /api/admin/users - Get all users (admin only)
router.get('/users', async (req, res) => {
    try {
        const dbService = databaseService_1.default.getInstance();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const result = await dbService.getAllUsers(page, limit, search);
        res.json({
            success: true,
            data: {
                users: result.users,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    pages: result.pages
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch users'
        });
    }
});
// PUT /api/admin/users/:id/role - Update user role (super admin only)
router.put('/users/:id/role', adminAuth_1.requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;
        if (!['user', 'admin', 'super_admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role specified'
            });
        }
        const dbService = databaseService_1.default.getInstance();
        const updatedUser = await dbService.updateUserRole(userId, role);
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            data: updatedUser,
            message: 'User role updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user role'
        });
    }
});
// PUT /api/admin/users/:id/status - Activate/deactivate user
router.put('/users/:id/status', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { isActive } = req.body;
        const dbService = databaseService_1.default.getInstance();
        const updatedUser = await dbService.updateUserStatus(userId, isActive);
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            data: updatedUser,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        });
    }
    catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user status'
        });
    }
});
// DELETE /api/admin/users/:id - Delete user (super admin only)
router.delete('/users/:id', adminAuth_1.requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        // Don't allow deleting your own account
        if (req.user?.id === userId) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete your own account'
            });
        }
        const dbService = databaseService_1.default.getInstance();
        const deleted = await dbService.deleteUser(userId);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});
// GET /api/admin/stats - Get admin dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const dbService = databaseService_1.default.getInstance();
        const stats = await dbService.getSystemStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch statistics'
        });
    }
});
// GET /api/admin/logs - Get system logs (admin only)
router.get('/logs', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const level = req.query.level; // 'error', 'warn', 'info'
        // In a real implementation, you'd fetch from your logging system
        // For now, returning mock data
        const logs = [
            {
                id: 1,
                level: 'info',
                message: 'User login successful',
                timestamp: new Date().toISOString(),
                userId: 123,
                metadata: { ip: '192.168.1.1' }
            },
            {
                id: 2,
                level: 'error',
                message: 'SMS sending failed',
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                userId: null,
                metadata: { error: 'Connection timeout' }
            }
        ];
        res.json({
            success: true,
            data: {
                logs: logs.slice(0, limit),
                total: logs.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch logs'
        });
    }
});
// POST /api/admin/system/backup - Create system backup (super admin only)
router.post('/system/backup', adminAuth_1.requireSuperAdmin, async (req, res) => {
    try {
        // In a real implementation, you'd trigger a database backup process
        const backupId = `backup_${Date.now()}`;
        res.json({
            success: true,
            data: {
                backupId,
                status: 'initiated',
                message: 'System backup initiated successfully'
            }
        });
    }
    catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create backup'
        });
    }
});
exports.default = router;
