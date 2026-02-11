import express from 'express';

const router = express.Router();

// In-memory storage for analytics (replace with database in production)
const propertyInterests = [];
const sessionData = new Map();

/**
 * POST /api/analytics/property-interest
 * Track user interest in properties
 */
router.post('/property-interest', async (req, res) => {
  try {
    const { propertyId, sessionId, interested, timestamp, source, userMessage } = req.body;

    // Validate required fields
    if (!propertyId || !sessionId || typeof interested !== 'boolean') {
      return res.status(400).json({
        error: 'Missing required fields: propertyId, sessionId, interested'
      });
    }

    // Create interest record
    const interest = {
      id: `interest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      propertyId,
      sessionId,
      interested,
      timestamp: timestamp || new Date().toISOString(),
      source: source || 'chatbot-suggestion',
      userMessage: userMessage || '',
      ip: req.ip,
      userAgent: req.get('user-agent'),
      createdAt: new Date().toISOString(),
    };

    // Store in memory (replace with database insert)
    propertyInterests.push(interest);

    // Update session data
    if (!sessionData.has(sessionId)) {
      sessionData.set(sessionId, {
        sessionId,
        interests: [],
        createdAt: new Date().toISOString(),
      });
    }
    sessionData.get(sessionId).interests.push(interest.id);

    // In production, save to database:
    // await db.propertyInterests.create(interest);

    res.status(201).json({
      success: true,
      interestId: interest.id,
      message: 'Property interest tracked successfully'
    });

  } catch (error) {
    console.error('Error tracking property interest:', error);
    res.status(500).json({
      error: 'Failed to track property interest',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/property-interests
 * Get all property interests (admin only in production)
 */
router.get('/property-interests', async (req, res) => {
  try {
    const { sessionId, propertyId, interested, limit = 100 } = req.query;

    let filtered = [...propertyInterests];

    // Filter by session
    if (sessionId) {
      filtered = filtered.filter(i => i.sessionId === sessionId);
    }

    // Filter by property
    if (propertyId) {
      filtered = filtered.filter(i => i.propertyId === propertyId);
    }

    // Filter by interest status
    if (interested !== undefined) {
      const isInterested = interested === 'true';
      filtered = filtered.filter(i => i.interested === isInterested);
    }

    // Sort by most recent
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    filtered = filtered.slice(0, parseInt(limit));

    res.json({
      success: true,
      total: filtered.length,
      interests: filtered
    });

  } catch (error) {
    console.error('Error fetching property interests:', error);
    res.status(500).json({
      error: 'Failed to fetch property interests',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/session/:sessionId
 * Get analytics for a specific session
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = sessionData.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    // Get all interests for this session
    const interests = propertyInterests.filter(i => i.sessionId === sessionId);

    // Calculate stats
    const interestedCount = interests.filter(i => i.interested).length;
    const notInterestedCount = interests.filter(i => !i.interested).length;

    res.json({
      success: true,
      session: {
        sessionId,
        totalInteractions: interests.length,
        interestedCount,
        notInterestedCount,
        conversionRate: interests.length > 0
          ? ((interestedCount / interests.length) * 100).toFixed(2) + '%'
          : '0%',
        createdAt: session.createdAt,
        interests: interests.sort((a, b) =>
          new Date(b.timestamp) - new Date(a.timestamp)
        ),
      }
    });

  } catch (error) {
    console.error('Error fetching session analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch session analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/stats
 * Get overall analytics stats
 */
router.get('/stats', async (req, res) => {
  try {
    const totalInteractions = propertyInterests.length;
    const interestedCount = propertyInterests.filter(i => i.interested).length;
    const notInterestedCount = propertyInterests.filter(i => !i.interested).length;
    const uniqueSessions = new Set(propertyInterests.map(i => i.sessionId)).size;
    const uniqueProperties = new Set(propertyInterests.map(i => i.propertyId)).size;

    // Property interest counts
    const propertyStats = {};
    propertyInterests.forEach(interest => {
      if (!propertyStats[interest.propertyId]) {
        propertyStats[interest.propertyId] = {
          propertyId: interest.propertyId,
          totalViews: 0,
          interested: 0,
          notInterested: 0,
        };
      }
      propertyStats[interest.propertyId].totalViews++;
      if (interest.interested) {
        propertyStats[interest.propertyId].interested++;
      } else {
        propertyStats[interest.propertyId].notInterested++;
      }
    });

    // Top properties by interest
    const topProperties = Object.values(propertyStats)
      .sort((a, b) => b.interested - a.interested)
      .slice(0, 10);

    res.json({
      success: true,
      stats: {
        overview: {
          totalInteractions,
          interestedCount,
          notInterestedCount,
          conversionRate: totalInteractions > 0
            ? ((interestedCount / totalInteractions) * 100).toFixed(2) + '%'
            : '0%',
          uniqueSessions,
          uniqueProperties,
        },
        topProperties,
        recentInteractions: propertyInterests
          .slice(-20)
          .reverse(),
      }
    });

  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics stats',
      message: error.message
    });
  }
});

/**
 * DELETE /api/analytics/session/:sessionId
 * Clear analytics for a session (GDPR compliance)
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Remove from property interests
    const initialCount = propertyInterests.length;
    const filtered = propertyInterests.filter(i => i.sessionId !== sessionId);
    const removedCount = initialCount - filtered.length;

    // Clear the array
    propertyInterests.length = 0;
    propertyInterests.push(...filtered);

    // Remove session data
    sessionData.delete(sessionId);

    res.json({
      success: true,
      message: `Deleted ${removedCount} records for session ${sessionId}`,
      deletedCount: removedCount,
    });

  } catch (error) {
    console.error('Error deleting session analytics:', error);
    res.status(500).json({
      error: 'Failed to delete session analytics',
      message: error.message
    });
  }
});

export default router;
