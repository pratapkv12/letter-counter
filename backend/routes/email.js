const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Joi = require('joi');

const mailer = require('../utils/mailer');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Validation schemas
const leadSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  company: Joi.string().required(),
  position: Joi.string().optional(),
  industry: Joi.string().optional(),
  website: Joi.string().uri().optional()
});

const batchEmailSchema = Joi.object({
  leads: Joi.array().items(leadSchema).min(1).required(),
  campaign_name: Joi.string().required(),
  template_type: Joi.string().valid('cold_outreach', 'follow_up', 'custom').default('cold_outreach')
});

// POST /api/email/send-batch
router.post('/send-batch', async (req, res) => {
  try {
    const { error, value } = batchEmailSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details.map(d => d.message)
      });
    }

    const { leads, campaign_name, template_type } = value;
    logger.info(`Starting batch email campaign: ${campaign_name} with ${leads.length} leads`);

    const results = [];
    const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8001';

    for (const lead of leads) {
      try {
        // Call AI engine to generate personalized content
        const aiResponse = await fetch(`${AI_ENGINE_URL}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead,
            template_type,
            campaign_name
          })
        });

        if (!aiResponse.ok) {
          throw new Error(`AI Engine error: ${aiResponse.statusText}`);
        }

        const { subject, body } = await aiResponse.json();

        // Send email using mailer utility
        const emailResult = await mailer.sendEmail({
          to: lead.email,
          subject,
          html: body,
          metadata: {
            campaign_name,
            lead_id: lead.email,
            template_type
          }
        });

        results.push({
          lead: lead.email,
          status: 'sent',
          message_id: emailResult.messageId,
          subject
        });

        logger.info(`Email sent successfully to ${lead.email}`);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logger.error(`Failed to send email to ${lead.email}:`, error.message);
        results.push({
          lead: lead.email,
          status: 'failed',
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.status === 'sent').length;
    const failureCount = results.filter(r => r.status === 'failed').length;

    res.status(200).json({
      message: 'Batch email campaign completed',
      campaign_name,
      summary: {
        total: leads.length,
        sent: successCount,
        failed: failureCount
      },
      results
    });

  } catch (error) {
    logger.error('Batch email error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// POST /api/email/upload-leads
router.post('/upload-leads', upload.single('csv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please upload a CSV file'
      });
    }

    const leads = [];
    const filePath = req.file.path;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Validate and clean row data
          const lead = {
            name: row.name || row.Name || '',
            email: row.email || row.Email || '',
            company: row.company || row.Company || '',
            position: row.position || row.Position || row.title || row.Title || '',
            industry: row.industry || row.Industry || '',
            website: row.website || row.Website || row.url || row.URL || ''
          };

          // Basic validation
          if (lead.name && lead.email && lead.company) {
            leads.push(lead);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Validate leads
    const validLeads = [];
    const invalidLeads = [];

    for (const lead of leads) {
      const { error } = leadSchema.validate(lead);
      if (error) {
        invalidLeads.push({ lead, errors: error.details.map(d => d.message) });
      } else {
        validLeads.push(lead);
      }
    }

    res.status(200).json({
      message: 'CSV processed successfully',
      summary: {
        total: leads.length,
        valid: validLeads.length,
        invalid: invalidLeads.length
      },
      validLeads,
      invalidLeads: invalidLeads.slice(0, 10) // Limit to first 10 invalid leads
    });

  } catch (error) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    logger.error('CSV upload error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// GET /api/email/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    // This would typically query a database
    // For MVP, return mock data
    const campaigns = [
      {
        id: '1',
        name: 'Q4 Outreach Campaign',
        status: 'active',
        sent: 150,
        opened: 45,
        replied: 12,
        created_at: new Date().toISOString()
      }
    ];

    res.status(200).json({
      campaigns,
      total: campaigns.length
    });

  } catch (error) {
    logger.error('Get campaigns error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

module.exports = router;