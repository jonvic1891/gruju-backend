"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../utils/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(auth_1.authenticateToken);
// Get current user profile
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user?.id;
        const user = await database_1.DatabaseHelper.getOne('SELECT id, username, email, phone, created_at, updated_at FROM Users WHERE id = @userId', { userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});
// Update user profile
router.put('/profile', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { username, email, phone } = req.body;
        // Validate input
        if (!username || !email || !phone) {
            return res.status(400).json({ error: 'Username, email, and phone are required' });
        }
        // Check if email or username already exists for another user
        const existingUser = await database_1.DatabaseHelper.getOne('SELECT id FROM Users WHERE (email = @email OR username = @username) AND id != @userId', { email, username, userId });
        if (existingUser) {
            return res.status(409).json({ error: 'Email or username already exists' });
        }
        // Update user
        await database_1.DatabaseHelper.executeQuery('UPDATE Users SET username = @username, email = @email, phone = @phone, updated_at = GETUTCDATE() WHERE id = @userId', { username, email, phone, userId });
        // Get updated user data
        const updatedUser = await database_1.DatabaseHelper.getOne('SELECT id, username, email, phone, created_at, updated_at FROM Users WHERE id = @userId', { userId });
        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: updatedUser,
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// Change password
router.post('/change-password', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters long' });
        }
        // Get current user with password hash
        const user = await database_1.DatabaseHelper.getOne('SELECT id, password_hash FROM Users WHERE id = @userId', { userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify current password
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.password_hash);
        if (!isCurrentPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const saltRounds = 12;
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
        // Update password
        await database_1.DatabaseHelper.executeQuery('UPDATE Users SET password_hash = @newPasswordHash, updated_at = GETUTCDATE() WHERE id = @userId', { newPasswordHash, userId });
        res.json({
            success: true,
            message: 'Password changed successfully',
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});
// Delete user account
router.delete('/account', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { password } = req.body;
        // Validate password for account deletion
        if (!password) {
            return res.status(400).json({ error: 'Password confirmation required' });
        }
        // Get user with password hash
        const user = await database_1.DatabaseHelper.getOne('SELECT id, password_hash FROM Users WHERE id = @userId', { userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Verify password
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Password is incorrect' });
        }
        // Delete user (cascading deletes will handle children, activities, etc.)
        await database_1.DatabaseHelper.executeQuery('DELETE FROM Users WHERE id = @userId', { userId });
        res.json({
            success: true,
            message: 'Account deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Failed to delete account' });
    }
});
// Get user statistics
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user?.id;
        // Get children count
        const childrenResult = await database_1.DatabaseHelper.getOne('SELECT COUNT(*) as count FROM Children WHERE parent_id = @userId', { userId });
        // Get activities count
        const activitiesResult = await database_1.DatabaseHelper.getOne(`SELECT COUNT(*) as count FROM Activities a 
       INNER JOIN Children c ON a.child_id = c.id 
       WHERE c.parent_id = @userId`, { userId });
        // Get connections count
        const connectionsResult = await database_1.DatabaseHelper.getOne(`SELECT COUNT(*) as count FROM Connections conn
       INNER JOIN Children c1 ON conn.child1_id = c1.id OR conn.child2_id = c1.id
       WHERE c1.parent_id = @userId AND conn.status = 'active'`, { userId });
        res.json({
            success: true,
            data: {
                children: childrenResult?.count || 0,
                activities: activitiesResult?.count || 0,
                connections: connectionsResult?.count || 0,
            },
        });
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});
exports.default = router;
