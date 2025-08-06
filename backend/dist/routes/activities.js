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
// Get all activities for the current user's children
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { start_date, end_date, child_id } = req.query;
        let query = `
      SELECT a.id, a.name, a.start_date, a.end_date, a.start_time, a.end_time, 
             a.website_url, a.created_at, a.updated_at, c.name as child_name, c.id as child_id
      FROM Activities a
      INNER JOIN Children c ON a.child_id = c.id
      WHERE c.parent_id = @userId
    `;
        const params = { userId };
        // Add date range filter if provided
        if (start_date && end_date) {
            query += ` AND a.start_date >= @start_date AND a.end_date <= @end_date`;
            params.start_date = start_date;
            params.end_date = end_date;
        }
        // Add child filter if provided
        if (child_id) {
            query += ` AND c.id = @child_id`;
            params.child_id = parseInt(child_id);
        }
        query += ` ORDER BY a.start_date DESC, a.start_time DESC`;
        const activities = await database_1.DatabaseHelper.getMany(query, params);
        res.json({
            success: true,
            data: activities,
        });
    }
    catch (error) {
        console.error('Get activities error:', error);
        res.status(500).json({ error: 'Failed to get activities' });
    }
});
// Get a specific activity by ID
router.get('/:activityId', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { activityId } = req.params;
        // Get activity with child ownership validation
        const activity = await database_1.DatabaseHelper.getOne(`SELECT a.id, a.name, a.start_date, a.end_date, a.start_time, a.end_time, 
              a.website_url, a.created_at, a.updated_at, c.name as child_name
       FROM Activities a
       INNER JOIN Children c ON a.child_id = c.id
       WHERE a.id = @activityId AND c.parent_id = @userId`, { activityId: parseInt(activityId), userId });
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        res.json({
            success: true,
            data: activity,
        });
    }
    catch (error) {
        console.error('Get activity error:', error);
        res.status(500).json({ error: 'Failed to get activity' });
    }
});
// Update an activity
router.put('/:activityId', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { activityId } = req.params;
        const { name, start_date, end_date, start_time, end_time, website_url } = req.body;
        // Validate input
        if (!name || !start_date || !end_date || !start_time || !end_time) {
            return res.status(400).json({
                error: 'Activity name, start date, end date, start time, and end time are required'
            });
        }
        // Check if activity exists and user owns the child
        const existingActivity = await database_1.DatabaseHelper.getOne(`SELECT a.id FROM Activities a
       INNER JOIN Children c ON a.child_id = c.id
       WHERE a.id = @activityId AND c.parent_id = @userId`, { activityId: parseInt(activityId), userId });
        if (!existingActivity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        // Validate dates
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        if (endDate < startDate) {
            return res.status(400).json({ error: 'End date cannot be before start date' });
        }
        // Update activity
        await database_1.DatabaseHelper.executeQuery(`UPDATE Activities 
       SET name = @name, start_date = @start_date, end_date = @end_date, 
           start_time = @start_time, end_time = @end_time, website_url = @website_url,
           updated_at = GETUTCDATE()
       WHERE id = @activityId`, {
            name: name.trim(),
            start_date,
            end_date,
            start_time,
            end_time,
            website_url: website_url || null,
            activityId: parseInt(activityId),
        });
        // Get updated activity
        const updatedActivity = await database_1.DatabaseHelper.getOne('SELECT id, name, start_date, end_date, start_time, end_time, website_url, created_at, updated_at FROM Activities WHERE id = @activityId', { activityId: parseInt(activityId) });
        res.json({
            success: true,
            message: 'Activity updated successfully',
            data: updatedActivity,
        });
    }
    catch (error) {
        console.error('Update activity error:', error);
        res.status(500).json({ error: 'Failed to update activity' });
    }
});
// Delete an activity
router.delete('/:activityId', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { activityId } = req.params;
        // Check if activity exists and user owns the child
        const existingActivity = await database_1.DatabaseHelper.getOne(`SELECT a.id, a.child_id FROM Activities a
       INNER JOIN Children c ON a.child_id = c.id
       WHERE a.id = @activityId AND c.parent_id = @userId`, { activityId: parseInt(activityId), userId });
        if (!existingActivity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        // TODO: Send notifications to connected parents about activity deletion
        // This would be implemented when we add the notifications system
        // Delete activity
        await database_1.DatabaseHelper.executeQuery('DELETE FROM Activities WHERE id = @activityId', { activityId: parseInt(activityId) });
        res.json({
            success: true,
            message: 'Activity deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete activity error:', error);
        res.status(500).json({ error: 'Failed to delete activity' });
    }
});
// Duplicate an activity
router.post('/:activityId/duplicate', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { activityId } = req.params;
        const { new_start_date, new_end_date } = req.body;
        if (!new_start_date || !new_end_date) {
            return res.status(400).json({ error: 'New start date and end date are required' });
        }
        // Get the original activity
        const originalActivity = await database_1.DatabaseHelper.getOne(`SELECT a.* FROM Activities a
       INNER JOIN Children c ON a.child_id = c.id
       WHERE a.id = @activityId AND c.parent_id = @userId`, { activityId: parseInt(activityId), userId });
        if (!originalActivity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        // Validate new dates
        const newStartDate = new Date(new_start_date);
        const newEndDate = new Date(new_end_date);
        if (newEndDate < newStartDate) {
            return res.status(400).json({ error: 'End date cannot be before start date' });
        }
        // Create duplicate activity
        const newActivityId = await database_1.DatabaseHelper.insertAndGetId(`INSERT INTO Activities (child_id, name, start_date, end_date, start_time, end_time, website_url) 
       VALUES (@child_id, @name, @start_date, @end_date, @start_time, @end_time, @website_url)`, {
            child_id: originalActivity.child_id,
            name: `${originalActivity.name} (Copy)`,
            start_date: new_start_date,
            end_date: new_end_date,
            start_time: originalActivity.start_time,
            end_time: originalActivity.end_time,
            website_url: originalActivity.website_url,
        });
        // Get the new activity
        const newActivity = await database_1.DatabaseHelper.getOne('SELECT id, name, start_date, end_date, start_time, end_time, website_url, created_at, updated_at FROM Activities WHERE id = @newActivityId', { newActivityId });
        res.status(201).json({
            success: true,
            message: 'Activity duplicated successfully',
            data: newActivity,
        });
    }
    catch (error) {
        console.error('Duplicate activity error:', error);
        res.status(500).json({ error: 'Failed to duplicate activity' });
    }
});
// Send activity invitation
router.post('/:activityId/invite', async (req, res) => {
    try {
        const userId = req.user?.id;
        const { activityId } = req.params;
        const { invited_parent_id, child_id, message } = req.body;
        if (!invited_parent_id) {
            return res.status(400).json({ error: 'Invited parent ID is required' });
        }
        // Check if activity exists and user owns it
        const activity = await database_1.DatabaseHelper.getOne(`SELECT a.id, a.name FROM Activities a
       INNER JOIN Children c ON a.child_id = c.id
       WHERE a.id = @activityId AND c.parent_id = @userId`, { activityId: parseInt(activityId), userId });
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found or not owned by user' });
        }
        // Check if invitation already exists
        const existingInvite = await database_1.DatabaseHelper.getOne(`SELECT id FROM activity_invitations 
       WHERE activity_id = @activityId AND invited_parent_id = @invited_parent_id`, { activityId: parseInt(activityId), invited_parent_id });
        if (existingInvite) {
            return res.status(409).json({ error: 'Invitation already sent to this parent' });
        }
        // Create invitation
        const inviteId = await database_1.DatabaseHelper.insertAndGetId(`INSERT INTO activity_invitations (activity_id, inviter_parent_id, invited_parent_id, child_id, status, message, created_at) 
       VALUES (@activity_id, @inviter_parent_id, @invited_parent_id, @child_id, 'pending', @message, GETUTCDATE())`, {
            activity_id: parseInt(activityId),
            inviter_parent_id: userId,
            invited_parent_id: parseInt(invited_parent_id),
            child_id: child_id ? parseInt(child_id) : null,
            message: message || null
        });
        res.json({
            success: true,
            message: 'Invitation sent successfully',
            data: { inviteId }
        });
    }
    catch (error) {
        console.error('Send invitation error:', error);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});
exports.default = router;
