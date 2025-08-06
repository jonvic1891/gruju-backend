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
// Get all activity invitations for the current user
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        // Get invitations sent to this user with activity details
        const invitations = await database_1.DatabaseHelper.getMany(`SELECT ai.id, ai.activity_id, ai.inviter_parent_id, ai.invited_parent_id, 
              ai.child_id, ai.status, ai.message, ai.created_at, ai.updated_at,
              a.name as activity_name, a.description as activity_description,
              a.start_date, a.end_date, a.start_time, a.end_time, a.location, a.cost, a.website_url,
              u.username as inviter_name, u.email as inviter_email,
              c.name as child_name
       FROM activity_invitations ai
       INNER JOIN Activities a ON ai.activity_id = a.id
       INNER JOIN Users u ON ai.inviter_parent_id = u.id
       LEFT JOIN Children c ON ai.child_id = c.id
       WHERE ai.invited_parent_id = @userId
       ORDER BY ai.created_at DESC`, { userId });
        res.json({
            success: true,
            data: invitations,
        });
    }
    catch (error) {
        console.error('Get activity invitations error:', error);
        res.status(500).json({ error: 'Failed to fetch activity invitations' });
    }
});
// Get invitations sent by the current user
router.get('/sent', async (req, res) => {
    try {
        const userId = req.user?.id;
        const sentInvitations = await database_1.DatabaseHelper.getMany(`SELECT ai.id, ai.activity_id, ai.inviter_parent_id, ai.invited_parent_id, 
              ai.child_id, ai.status, ai.message, ai.created_at, ai.updated_at,
              a.name as activity_name, a.description as activity_description,
              a.start_date, a.end_date, a.start_time, a.end_time, a.location,
              u.username as invited_parent_name, u.email as invited_parent_email,
              c.name as child_name
       FROM activity_invitations ai
       INNER JOIN Activities a ON ai.activity_id = a.id
       INNER JOIN Users u ON ai.invited_parent_id = u.id
       LEFT JOIN Children c ON ai.child_id = c.id
       WHERE ai.inviter_parent_id = @userId
       ORDER BY ai.created_at DESC`, { userId });
        res.json({
            success: true,
            data: sentInvitations,
        });
    }
    catch (error) {
        console.error('Get sent invitations error:', error);
        res.status(500).json({ error: 'Failed to fetch sent invitations' });
    }
});
// Respond to an activity invitation (accept/reject)
router.post('/:invitationId/respond', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { invitationId } = req.params;
        const { action } = req.body;
        if (!action || !['accept', 'reject'].includes(action)) {
            return res.status(400).json({ error: 'Action must be "accept" or "reject"' });
        }
        // Check if invitation exists and belongs to this user
        const invitation = await database_1.DatabaseHelper.getOne(`SELECT ai.id, ai.activity_id, ai.status, a.name as activity_name
       FROM activity_invitations ai
       INNER JOIN Activities a ON ai.activity_id = a.id
       WHERE ai.id = @invitationId AND ai.invited_parent_id = @userId`, { invitationId: parseInt(invitationId), userId });
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation not found' });
        }
        if (invitation.status !== 'pending') {
            return res.status(409).json({ error: `Invitation has already been ${invitation.status}` });
        }
        // Update invitation status
        await database_1.DatabaseHelper.executeQuery(`UPDATE activity_invitations 
       SET status = @status, updated_at = NOW()
       WHERE id = @invitationId`, {
            status: action === 'accept' ? 'accepted' : 'rejected',
            invitationId: parseInt(invitationId),
        });
        res.json({
            success: true,
            message: `Invitation ${action}ed successfully`,
            data: {
                invitationId: parseInt(invitationId),
                action,
                activityName: invitation.activity_name
            }
        });
    }
    catch (error) {
        console.error('Respond to invitation error:', error);
        res.status(500).json({ error: 'Failed to respond to invitation' });
    }
});
// Get invitation counts for notifications
router.get('/counts', async (req, res) => {
    try {
        const userId = req.user?.id;
        const counts = await database_1.DatabaseHelper.getOne(`SELECT 
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
         COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count,
         COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
       FROM activity_invitations 
       WHERE invited_parent_id = @userId`, { userId });
        res.json({
            success: true,
            data: counts || { pending_count: 0, accepted_count: 0, rejected_count: 0 }
        });
    }
    catch (error) {
        console.error('Get invitation counts error:', error);
        res.status(500).json({ error: 'Failed to get invitation counts' });
    }
});
exports.default = router;
