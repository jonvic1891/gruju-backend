import express from 'express';
import { DatabaseHelper } from '../utils/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all children for the current user
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    const children = await DatabaseHelper.getMany(
      'SELECT id, name, created_at, updated_at FROM Children WHERE parent_id = @userId ORDER BY created_at DESC',
      { userId }
    );

    res.json({
      success: true,
      data: children,
    });
  } catch (error) {
    console.error('Get children error:', error);
    res.status(500).json({ error: 'Failed to get children' });
  }
});

// Get a specific child by ID
router.get('/:childId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { childId } = req.params;

    const child = await DatabaseHelper.getOne(
      'SELECT id, name, created_at, updated_at FROM Children WHERE id = @childId AND parent_id = @userId',
      { childId: parseInt(childId), userId }
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    res.json({
      success: true,
      data: child,
    });
  } catch (error) {
    console.error('Get child error:', error);
    res.status(500).json({ error: 'Failed to get child' });
  }
});

// Create a new child
router.post('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { name } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Child name is required' });
    }

    // Check if child name already exists for this parent
    const existingChild = await DatabaseHelper.getOne(
      'SELECT id FROM Children WHERE name = @name AND parent_id = @userId',
      { name: name.trim(), userId }
    );

    if (existingChild) {
      return res.status(409).json({ error: 'A child with this name already exists' });
    }

    // Create child
    const childId = await DatabaseHelper.insertAndGetId(
      'INSERT INTO Children (name, parent_id) VALUES (@name, @userId)',
      { name: name.trim(), userId }
    );

    // Get created child
    const newChild = await DatabaseHelper.getOne(
      'SELECT id, name, created_at, updated_at FROM Children WHERE id = @childId',
      { childId }
    );

    res.status(201).json({
      success: true,
      message: 'Child created successfully',
      data: newChild,
    });
  } catch (error) {
    console.error('Create child error:', error);
    res.status(500).json({ error: 'Failed to create child' });
  }
});

// Update a child
router.put('/:childId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { childId } = req.params;
    const { name } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Child name is required' });
    }

    // Check if child exists and belongs to the user
    const existingChild = await DatabaseHelper.getOne(
      'SELECT id FROM Children WHERE id = @childId AND parent_id = @userId',
      { childId: parseInt(childId), userId }
    );

    if (!existingChild) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Check if new name conflicts with another child
    const nameConflict = await DatabaseHelper.getOne(
      'SELECT id FROM Children WHERE name = @name AND parent_id = @userId AND id != @childId',
      { name: name.trim(), userId, childId: parseInt(childId) }
    );

    if (nameConflict) {
      return res.status(409).json({ error: 'A child with this name already exists' });
    }

    // Update child
    await DatabaseHelper.executeQuery(
      'UPDATE Children SET name = @name, updated_at = GETUTCDATE() WHERE id = @childId AND parent_id = @userId',
      { name: name.trim(), childId: parseInt(childId), userId }
    );

    // Get updated child
    const updatedChild = await DatabaseHelper.getOne(
      'SELECT id, name, created_at, updated_at FROM Children WHERE id = @childId',
      { childId: parseInt(childId) }
    );

    res.json({
      success: true,
      message: 'Child updated successfully',
      data: updatedChild,
    });
  } catch (error) {
    console.error('Update child error:', error);
    res.status(500).json({ error: 'Failed to update child' });
  }
});

// Delete a child
router.delete('/:childId', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { childId } = req.params;

    // Check if child exists and belongs to the user
    const existingChild = await DatabaseHelper.getOne(
      'SELECT id FROM Children WHERE id = @childId AND parent_id = @userId',
      { childId: parseInt(childId), userId }
    );

    if (!existingChild) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Delete child (cascading deletes will handle activities and connections)
    await DatabaseHelper.executeQuery(
      'DELETE FROM Children WHERE id = @childId AND parent_id = @userId',
      { childId: parseInt(childId), userId }
    );

    res.json({
      success: true,
      message: 'Child deleted successfully',
    });
  } catch (error) {
    console.error('Delete child error:', error);
    res.status(500).json({ error: 'Failed to delete child' });
  }
});

// Get activities for a specific child
router.get('/:childId/activities', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { childId } = req.params;

    // Check if child exists and belongs to the user
    const child = await DatabaseHelper.getOne(
      'SELECT id FROM Children WHERE id = @childId AND parent_id = @userId',
      { childId: parseInt(childId), userId }
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get activities for the child
    const activities = await DatabaseHelper.getMany(
      `SELECT id, name, start_date, end_date, start_time, end_time, website_url, created_at, updated_at 
       FROM Activities 
       WHERE child_id = @childId 
       ORDER BY start_date DESC, start_time DESC`,
      { childId: parseInt(childId) }
    );

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Get child activities error:', error);
    res.status(500).json({ error: 'Failed to get child activities' });
  }
});

// Create activity for a specific child
router.post('/:childId/activities', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { childId } = req.params;
    const { name, start_date, end_date, start_time, end_time, website_url } = req.body;

    // Validate input
    if (!name || !start_date || !end_date || !start_time || !end_time) {
      return res.status(400).json({ 
        error: 'Activity name, start date, end date, start time, and end time are required' 
      });
    }

    // Check if child exists and belongs to the user
    const child = await DatabaseHelper.getOne(
      'SELECT id FROM Children WHERE id = @childId AND parent_id = @userId',
      { childId: parseInt(childId), userId }
    );

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (endDate < startDate) {
      return res.status(400).json({ error: 'End date cannot be before start date' });
    }

    // Create activity
    const activityId = await DatabaseHelper.insertAndGetId(
      `INSERT INTO Activities (child_id, name, start_date, end_date, start_time, end_time, website_url) 
       VALUES (@childId, @name, @start_date, @end_date, @start_time, @end_time, @website_url)`,
      {
        childId: parseInt(childId),
        name: name.trim(),
        start_date,
        end_date,
        start_time,
        end_time,
        website_url: website_url || null,
      }
    );

    // Get created activity
    const newActivity = await DatabaseHelper.getOne(
      'SELECT id, name, start_date, end_date, start_time, end_time, website_url, created_at, updated_at FROM Activities WHERE id = @activityId',
      { activityId }
    );

    res.status(201).json({
      success: true,
      message: 'Activity created successfully',
      data: newActivity,
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

export default router;