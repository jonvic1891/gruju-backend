import express from 'express';
import { DatabaseHelper } from '../utils/database';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all activities for user's children in a date range
router.get('/activities', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    // Get activities for all user's children within date range
    const activities = await DatabaseHelper.getMany(
      `SELECT a.id, a.name, a.start_date, a.end_date, a.start_time, a.end_time, 
              a.website_url, a.created_at, a.updated_at, 
              c.name as child_name, c.id as child_id
       FROM Activities a
       INNER JOIN Children c ON a.child_id = c.id
       WHERE c.parent_id = @userId 
         AND a.start_date <= @end_date 
         AND a.end_date >= @start_date
       ORDER BY a.start_date, a.start_time`,
      { 
        userId, 
        start_date: start as string, 
        end_date: end as string 
      }
    );

    res.json({
      success: true,
      data: activities,
    });
  } catch (error) {
    console.error('Get calendar activities error:', error);
    res.status(500).json({ error: 'Failed to get calendar activities' });
  }
});

// Get activities for connected children in a date range
router.get('/connected-activities', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    // Get activities for connected children
    const connectedActivities = await DatabaseHelper.getMany(
      `SELECT DISTINCT a.id, a.name, a.start_date, a.end_date, a.start_time, a.end_time, 
              a.website_url, a.created_at, a.updated_at,
              c.name as child_name, c.id as child_id,
              u.username as parent_username
       FROM Activities a
       INNER JOIN Children c ON a.child_id = c.id
       INNER JOIN Users u ON c.parent_id = u.id
       INNER JOIN (
         -- Get children connected to user's children
         SELECT DISTINCT 
           CASE 
             WHEN conn.child1_id IN (SELECT id FROM Children WHERE parent_id = @userId)
             THEN conn.child2_id
             ELSE conn.child1_id
           END as connected_child_id
         FROM Connections conn
         INNER JOIN Children c1 ON conn.child1_id = c1.id OR conn.child2_id = c1.id
         WHERE (c1.parent_id = @userId OR 
                conn.child1_id IN (SELECT id FROM Children WHERE parent_id = @userId) OR
                conn.child2_id IN (SELECT id FROM Children WHERE parent_id = @userId))
           AND conn.status = 'active'
       ) connected ON c.id = connected.connected_child_id
       WHERE c.parent_id != @userId
         AND a.start_date <= @end_date 
         AND a.end_date >= @start_date
       ORDER BY a.start_date, a.start_time`,
      { 
        userId, 
        start_date: start as string, 
        end_date: end as string 
      }
    );

    res.json({
      success: true,
      data: connectedActivities,
    });
  } catch (error) {
    console.error('Get connected activities error:', error);
    res.status(500).json({ error: 'Failed to get connected activities' });
  }
});

// Get activity counts by date for a month
router.get('/activity-counts', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { start, end, include_connected } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    let query = `
      SELECT 
        a.start_date as date,
        COUNT(*) as activity_count
      FROM Activities a
      INNER JOIN Children c ON a.child_id = c.id
      WHERE c.parent_id = @userId 
        AND a.start_date <= @end_date 
        AND a.end_date >= @start_date
    `;

    // Add connected children activities if requested
    if (include_connected === 'true') {
      query = `
        SELECT 
          a.start_date as date,
          COUNT(*) as activity_count
        FROM Activities a
        INNER JOIN Children c ON a.child_id = c.id
        WHERE (
          c.parent_id = @userId 
          OR c.id IN (
            SELECT DISTINCT 
              CASE 
                WHEN conn.child1_id IN (SELECT id FROM Children WHERE parent_id = @userId)
                THEN conn.child2_id
                ELSE conn.child1_id
              END
            FROM Connections conn
            INNER JOIN Children c1 ON conn.child1_id = c1.id OR conn.child2_id = c1.id
            WHERE (c1.parent_id = @userId OR 
                   conn.child1_id IN (SELECT id FROM Children WHERE parent_id = @userId) OR
                   conn.child2_id IN (SELECT id FROM Children WHERE parent_id = @userId))
              AND conn.status = 'active'
          )
        )
        AND a.start_date <= @end_date 
        AND a.end_date >= @start_date
      `;
    }

    query += ' GROUP BY a.start_date ORDER BY a.start_date';

    const activityCounts = await DatabaseHelper.getMany(query, { 
      userId, 
      start_date: start as string, 
      end_date: end as string 
    });

    res.json({
      success: true,
      data: activityCounts,
    });
  } catch (error) {
    console.error('Get activity counts error:', error);
    res.status(500).json({ error: 'Failed to get activity counts' });
  }
});

// Get activities for a specific date
router.get('/activities/:date', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { date } = req.params;
    const { include_connected } = req.query;

    // Get user's children activities for the specific date
    let ownActivities = await DatabaseHelper.getMany(
      `SELECT a.id, a.name, a.start_date, a.end_date, a.start_time, a.end_time, 
              a.website_url, a.created_at, a.updated_at,
              c.name as child_name, c.id as child_id,
              'own' as activity_type
       FROM Activities a
       INNER JOIN Children c ON a.child_id = c.id
       WHERE c.parent_id = @userId 
         AND a.start_date <= @date 
         AND a.end_date >= @date
       ORDER BY a.start_time`,
      { userId, date }
    );

    let allActivities = ownActivities;

    // Add connected children activities if requested
    if (include_connected === 'true') {
      const connectedActivities = await DatabaseHelper.getMany(
        `SELECT DISTINCT a.id, a.name, a.start_date, a.end_date, a.start_time, a.end_time, 
                a.website_url, a.created_at, a.updated_at,
                c.name as child_name, c.id as child_id,
                u.username as parent_username,
                'connected' as activity_type
         FROM Activities a
         INNER JOIN Children c ON a.child_id = c.id
         INNER JOIN Users u ON c.parent_id = u.id
         INNER JOIN (
           SELECT DISTINCT 
             CASE 
               WHEN conn.child1_id IN (SELECT id FROM Children WHERE parent_id = @userId)
               THEN conn.child2_id
               ELSE conn.child1_id
             END as connected_child_id
           FROM Connections conn
           INNER JOIN Children c1 ON conn.child1_id = c1.id OR conn.child2_id = c1.id
           WHERE (c1.parent_id = @userId OR 
                  conn.child1_id IN (SELECT id FROM Children WHERE parent_id = @userId) OR
                  conn.child2_id IN (SELECT id FROM Children WHERE parent_id = @userId))
             AND conn.status = 'active'
         ) connected ON c.id = connected.connected_child_id
         WHERE c.parent_id != @userId
           AND a.start_date <= @date 
           AND a.end_date >= @date
         ORDER BY a.start_time`,
        { userId, date }
      );

      allActivities = [...ownActivities, ...connectedActivities];
    }

    res.json({
      success: true,
      data: allActivities,
    });
  } catch (error) {
    console.error('Get date activities error:', error);
    res.status(500).json({ error: 'Failed to get activities for date' });
  }
});

// Get activities from accepted invitations in a date range
router.get('/invited-activities', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    // Get activities from accepted invitations
    const invitedActivities = await DatabaseHelper.getMany(
      `SELECT DISTINCT a.id, a.name, a.start_date, a.end_date, a.start_time, a.end_time, 
              a.website_url, a.created_at, a.updated_at, a.description, a.location, a.cost,
              c.name as child_name, c.id as child_id,
              u.username as host_parent_username,
              ai.message as invitation_message
       FROM Activities a
       INNER JOIN Children c ON a.child_id = c.id
       INNER JOIN Users u ON c.parent_id = u.id
       INNER JOIN activity_invitations ai ON a.id = ai.activity_id
       WHERE ai.invited_parent_id = @userId
         AND ai.status = 'accepted'
         AND a.start_date <= @end_date 
         AND a.end_date >= @start_date
       ORDER BY a.start_date, a.start_time`,
      { 
        userId, 
        start_date: start as string, 
        end_date: end as string 
      }
    );

    res.json({
      success: true,
      data: invitedActivities,
    });
  } catch (error) {
    console.error('Get invited activities error:', error);
    res.status(500).json({ error: 'Failed to get invited activities' });
  }
});

export default router;