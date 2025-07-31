"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../utils/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(auth_1.authenticateToken);
// Search for parents by email or phone
router.get('/search', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { q } = req.query;
        if (!q || typeof q !== 'string' || q.trim().length < 3) {
            return res.status(400).json({ error: 'Search query must be at least 3 characters' });
        }
        const searchTerm = q.trim();
        // Search for users by email or phone (excluding current user)
        const users = await database_1.DatabaseHelper.getMany(`SELECT id, username, email, phone, created_at 
       FROM Users 
       WHERE (email LIKE @searchTerm OR phone LIKE @searchTerm) 
         AND id != @userId`, {
            searchTerm: `%${searchTerm}%`,
            userId
        });
        // For each user, get their children
        const usersWithChildren = await Promise.all(users.map(async (user) => {
            const children = await database_1.DatabaseHelper.getMany('SELECT id, name FROM Children WHERE parent_id = @parentId', { parentId: user.id });
            return { ...user, children };
        }));
        res.json({
            success: true,
            data: usersWithChildren,
        });
    }
    catch (error) {
        console.error('Search parents error:', error);
        res.status(500).json({ error: 'Failed to search parents' });
    }
});
// Send connection request
router.post('/request', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { target_parent_id, child_id, target_child_id, message } = req.body;
        // Validate input
        if (!target_parent_id || !child_id) {
            return res.status(400).json({ error: 'Target parent and child are required' });
        }
        // Check if requesting user owns the child
        const ownChild = await database_1.DatabaseHelper.getOne('SELECT id FROM Children WHERE id = @childId AND parent_id = @userId', { childId: child_id, userId });
        if (!ownChild) {
            return res.status(404).json({ error: 'Child not found or not owned by user' });
        }
        // Check if target parent exists
        const targetParent = await database_1.DatabaseHelper.getOne('SELECT id FROM Users WHERE id = @targetParentId', { targetParentId: target_parent_id });
        if (!targetParent) {
            return res.status(404).json({ error: 'Target parent not found' });
        }
        // Check if target child exists and belongs to target parent (if specified)
        if (target_child_id) {
            const targetChild = await database_1.DatabaseHelper.getOne('SELECT id FROM Children WHERE id = @targetChildId AND parent_id = @targetParentId', { targetChildId: target_child_id, targetParentId: target_parent_id });
            if (!targetChild) {
                return res.status(404).json({ error: 'Target child not found or not owned by target parent' });
            }
        }
        // Check if connection already exists
        const existingConnection = await database_1.DatabaseHelper.getOne(`SELECT id FROM Connections 
       WHERE ((child1_id = @childId AND child2_id = @targetChildId) 
           OR (child1_id = @targetChildId AND child2_id = @childId))
         AND status = 'active'`, {
            childId: child_id,
            targetChildId: target_child_id || child_id
        });
        if (existingConnection) {
            return res.status(409).json({ error: 'Connection already exists between these children' });
        }
        // Check if pending request already exists
        const existingRequest = await database_1.DatabaseHelper.getOne(`SELECT id FROM ConnectionRequests 
       WHERE requester_id = @userId 
         AND target_parent_id = @targetParentId 
         AND child_id = @childId 
         AND status = 'pending'`, {
            userId,
            targetParentId: target_parent_id,
            childId: child_id
        });
        if (existingRequest) {
            return res.status(409).json({ error: 'Connection request already pending' });
        }
        // Create connection request
        const requestId = await database_1.DatabaseHelper.insertAndGetId(`INSERT INTO ConnectionRequests (requester_id, target_parent_id, child_id, target_child_id, message, status) 
       VALUES (@userId, @targetParentId, @childId, @targetChildId, @message, 'pending')`, {
            userId,
            targetParentId: target_parent_id,
            childId: child_id,
            targetChildId: target_child_id || null,
            message: message || null,
        });
        // Get the created request with details
        const newRequest = await database_1.DatabaseHelper.getOne(`SELECT cr.*, u.username as requester_name, c.name as child_name,
              tc.name as target_child_name
       FROM ConnectionRequests cr
       INNER JOIN Users u ON cr.requester_id = u.id
       INNER JOIN Children c ON cr.child_id = c.id
       LEFT JOIN Children tc ON cr.target_child_id = tc.id
       WHERE cr.id = @requestId`, { requestId });
        // TODO: Send push notification to target parent
        res.status(201).json({
            success: true,
            message: 'Connection request sent successfully',
            data: newRequest,
        });
    }
    catch (error) {
        console.error('Send connection request error:', error);
        res.status(500).json({ error: 'Failed to send connection request' });
    }
});
// Get incoming connection requests
router.get('/requests', async (req, res) => {
    try {
        const userId = req.user?.id;
        const requests = await database_1.DatabaseHelper.getMany(`SELECT cr.*, u.username as requester_name, u.email as requester_email,
              c.name as child_name, tc.name as target_child_name
       FROM ConnectionRequests cr
       INNER JOIN Users u ON cr.requester_id = u.id
       INNER JOIN Children c ON cr.child_id = c.id
       LEFT JOIN Children tc ON cr.target_child_id = tc.id
       WHERE cr.target_parent_id = @userId AND cr.status = 'pending'
       ORDER BY cr.created_at DESC`, { userId });
        res.json({
            success: true,
            data: requests,
        });
    }
    catch (error) {
        console.error('Get connection requests error:', error);
        res.status(500).json({ error: 'Failed to get connection requests' });
    }
});
// Accept connection request
router.post('/requests/:requestId/accept', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { requestId } = req.params;
        // Get the request and verify ownership
        const request = await database_1.DatabaseHelper.getOne('SELECT * FROM ConnectionRequests WHERE id = @requestId AND target_parent_id = @userId AND status = \'pending\'', { requestId: parseInt(requestId), userId });
        if (!request) {
            return res.status(404).json({ error: 'Connection request not found' });
        }
        // Create the connection
        await database_1.DatabaseHelper.executeQuery('INSERT INTO Connections (child1_id, child2_id, status) VALUES (@child1Id, @child2Id, \'active\')', {
            child1Id: request.child_id,
            child2Id: request.target_child_id || request.child_id,
        });
        // Update request status
        await database_1.DatabaseHelper.executeQuery('UPDATE ConnectionRequests SET status = \'accepted\', updated_at = GETUTCDATE() WHERE id = @requestId', { requestId: parseInt(requestId) });
        // TODO: Send notification to requester
        res.json({
            success: true,
            message: 'Connection request accepted',
        });
    }
    catch (error) {
        console.error('Accept connection request error:', error);
        res.status(500).json({ error: 'Failed to accept connection request' });
    }
});
// Reject connection request
router.post('/requests/:requestId/reject', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { requestId } = req.params;
        // Get the request and verify ownership
        const request = await database_1.DatabaseHelper.getOne('SELECT * FROM ConnectionRequests WHERE id = @requestId AND target_parent_id = @userId AND status = \'pending\'', { requestId: parseInt(requestId), userId });
        if (!request) {
            return res.status(404).json({ error: 'Connection request not found' });
        }
        // Update request status
        await database_1.DatabaseHelper.executeQuery('UPDATE ConnectionRequests SET status = \'rejected\', updated_at = GETUTCDATE() WHERE id = @requestId', { requestId: parseInt(requestId) });
        // TODO: Send notification to requester
        res.json({
            success: true,
            message: 'Connection request rejected',
        });
    }
    catch (error) {
        console.error('Reject connection request error:', error);
        res.status(500).json({ error: 'Failed to reject connection request' });
    }
});
// Get active connections
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        const connections = await database_1.DatabaseHelper.getMany(`SELECT DISTINCT conn.id, conn.created_at,
              c1.id as child1_id, c1.name as child1_name,
              c2.id as child2_id, c2.name as child2_name,
              u1.id as parent1_id, u1.username as parent1_name,
              u2.id as parent2_id, u2.username as parent2_name,
              CASE 
                WHEN c1.parent_id = @userId THEN c2.id
                ELSE c1.id
              END as connected_child_id,
              CASE 
                WHEN c1.parent_id = @userId THEN c2.name
                ELSE c1.name
              END as connected_child_name,
              CASE 
                WHEN c1.parent_id = @userId THEN u2.username
                ELSE u1.username
              END as connected_parent_name
       FROM Connections conn
       INNER JOIN Children c1 ON conn.child1_id = c1.id
       INNER JOIN Children c2 ON conn.child2_id = c2.id
       INNER JOIN Users u1 ON c1.parent_id = u1.id
       INNER JOIN Users u2 ON c2.parent_id = u2.id
       WHERE (c1.parent_id = @userId OR c2.parent_id = @userId) 
         AND conn.status = 'active'
       ORDER BY conn.created_at DESC`, { userId });
        res.json({
            success: true,
            data: connections,
        });
    }
    catch (error) {
        console.error('Get connections error:', error);
        res.status(500).json({ error: 'Failed to get connections' });
    }
});
// Delete connection
router.delete('/:connectionId', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { connectionId } = req.params;
        // Verify user owns one of the children in the connection
        const connection = await database_1.DatabaseHelper.getOne(`SELECT conn.* FROM Connections conn
       INNER JOIN Children c1 ON conn.child1_id = c1.id
       INNER JOIN Children c2 ON conn.child2_id = c2.id
       WHERE conn.id = @connectionId 
         AND (c1.parent_id = @userId OR c2.parent_id = @userId)
         AND conn.status = 'active'`, { connectionId: parseInt(connectionId), userId });
        if (!connection) {
            return res.status(404).json({ error: 'Connection not found' });
        }
        // Update connection status to deleted
        await database_1.DatabaseHelper.executeQuery('UPDATE Connections SET status = \'deleted\', updated_at = GETUTCDATE() WHERE id = @connectionId', { connectionId: parseInt(connectionId) });
        // TODO: Send notification to other parent
        res.json({
            success: true,
            message: 'Connection deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete connection error:', error);
        res.status(500).json({ error: 'Failed to delete connection' });
    }
});
exports.default = router;
