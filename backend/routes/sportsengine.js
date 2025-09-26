const express = require('express');
const router = express.Router();
const sportsEngineService = require('../services/SportsEngineService');
const ManusAIService = require('../services/ManusAIService');

// Choose which service to use based on environment variable
const USE_MANUS_AI = process.env.USE_MANUS_AI === 'true' || process.env.MANUS_AI_API_KEY;
const activeService = USE_MANUS_AI ? new ManusAIService() : sportsEngineService;

// Authenticate with SportsEngine credentials
router.post('/authenticate', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    console.log(`Authentication attempt for: ${email}`);
    
    const result = await activeService.authenticate(email, password);
    
    if (result.success) {
      res.json({
        success: true,
        token: result.token,
        taskId: result.taskId,
        taskUrl: result.taskUrl,
        sessionData: result.sessionData || { 
          token: result.token, 
          taskId: result.taskId, 
          taskUrl: result.taskUrl 
        },
        message: result.message || 'Authentication successful'
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message || 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed due to server error'
    });
  }
});

// Validate credentials without creating session
router.post('/validate', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        valid: false,
        message: 'Email and password are required'
      });
    }

    const result = await activeService.validateCredentials(email, password);
    
    res.json({
      valid: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      valid: false,
      message: 'Validation failed due to server error'
    });
  }
});

// Test connection with existing session
router.get('/test', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
    }

    const result = await activeService.testConnection(token);
    
    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('Connection test error:', error);
    res.status(500).json({
      success: false,
      message: 'Connection test failed'
    });
  }
});

// Get organizations
router.get('/organizations', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'No authorization token provided'
      });
    }

    const organizations = await activeService.getOrganizations(token);
    
    res.json({
      organizations,
      count: organizations.length
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({
      error: 'Failed to fetch organizations'
    });
  }
});

// Get teams for an organization
router.get('/organizations/:orgId/teams', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { orgId } = req.params;
    
    if (!token) {
      return res.status(401).json({
        error: 'No authorization token provided'
      });
    }

    const teams = await activeService.getTeamsForOrganization(token, orgId);
    
    res.json({
      teams,
      count: teams.length
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      error: 'Failed to fetch teams'
    });
  }
});

// Get roster for a team
router.get('/teams/:teamId/roster', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { teamId } = req.params;
    
    if (!token) {
      return res.status(401).json({
        error: 'No authorization token provided'
      });
    }

    const roster = await activeService.getTeamRoster(token, teamId);
    
    res.json({
      roster,
      playerCount: roster.players?.length || 0,
      staffCount: roster.staff?.length || 0
    });
  } catch (error) {
    console.error('Get roster error:', error);
    res.status(500).json({
      error: 'Failed to fetch team roster'
    });
  }
});

// Get migration preview (all data summary)
router.get('/migration-preview', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'No authorization token provided'
      });
    }

    const preview = await activeService.getMigrationPreview(token);
    
    res.json({
      preview
    });
  } catch (error) {
    console.error('Get migration preview error:', error);
    res.status(500).json({
      error: 'Failed to generate migration preview'
    });
  }
});

// Webhook endpoint for Manus AI task completion notifications
router.post('/manus-webhook', async (req, res) => {
  try {
    console.log('Received Manus AI webhook notification');
    
    if (USE_MANUS_AI && activeService.handleWebhookNotification) {
      await activeService.handleWebhookNotification(req.body);
      
      res.status(200).json({
        success: true,
        message: 'Webhook notification processed'
      });
    } else {
      res.status(400).json({
        error: 'Manus AI not enabled or webhook handler not available'
      });
    }
  } catch (error) {
    console.error('Manus AI webhook error:', error);
    res.status(500).json({
      error: 'Failed to process webhook notification'
    });
  }
});

// Check task completion manually (workaround for webhook issues)
router.post('/check-task-completion', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'No authorization token provided'
      });
    }

    if (USE_MANUS_AI && activeService.checkTaskCompletion) {
      const result = await activeService.checkTaskCompletion(token);
      
      res.json({
        success: true,
        completed: result.completed,
        message: result.message,
        data: result.data
      });
    } else {
      res.status(400).json({
        error: 'Manus AI not enabled or task completion check not available'
      });
    }
  } catch (error) {
    console.error('Check task completion error:', error);
    res.status(500).json({
      error: 'Failed to check task completion'
    });
  }
});

// Submit extracted data from Manus AI task
router.post('/submit-extracted-data', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { extractedData } = req.body;
    
    if (!token) {
      return res.status(401).json({
        error: 'No authorization token provided'
      });
    }

    if (!extractedData) {
      return res.status(400).json({
        error: 'No extracted data provided'
      });
    }

    // Store the extracted data in the session
    if (USE_MANUS_AI && activeService.getSession) {
      const sessionData = activeService.getSession(token);
      if (sessionData) {
        sessionData.extractedData = extractedData;
        console.log('Stored extracted data from Manus AI:', JSON.stringify(extractedData, null, 2));
        
        res.json({
          success: true,
          message: 'Extracted data stored successfully',
          teamsCount: extractedData.teams?.length || 0
        });
      } else {
        res.status(401).json({
          error: 'Invalid session token'
        });
      }
    } else {
      res.status(400).json({
        error: 'Manus AI not enabled or session management not available'
      });
    }
  } catch (error) {
    console.error('Submit extracted data error:', error);
    res.status(500).json({
      error: 'Failed to store extracted data'
    });
  }
});

module.exports = router;
