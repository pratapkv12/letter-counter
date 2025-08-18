const express = require('express');
const crypto = require('crypto');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware to verify webhook signatures
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-webhook-signature'] || req.headers['x-sendgrid-signature'];
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn('Webhook secret not configured, skipping signature verification');
    return next();
  }

  if (!signature) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing webhook signature'
    });
  }

  try {
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature))) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature'
      });
    }

    next();
  } catch (error) {
    logger.error('Webhook signature verification error:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Signature verification failed'
    });
  }
};

// POST /api/webhooks/email-events
router.post('/email-events', verifyWebhookSignature, async (req, res) => {
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    logger.info(`Received ${events.length} email events`);

    for (const event of events) {
      await processEmailEvent(event);
    }

    res.status(200).json({
      message: 'Events processed successfully',
      processed: events.length
    });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// POST /api/webhooks/sendgrid
router.post('/sendgrid', verifyWebhookSignature, async (req, res) => {
  try {
    const events = req.body;
    
    logger.info(`Received ${events.length} SendGrid events`);

    for (const event of events) {
      await processSendGridEvent(event);
    }

    res.status(200).json({
      message: 'SendGrid events processed successfully',
      processed: events.length
    });

  } catch (error) {
    logger.error('SendGrid webhook processing error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// POST /api/webhooks/mailgun
router.post('/mailgun', verifyWebhookSignature, async (req, res) => {
  try {
    const event = req.body;
    
    logger.info('Received Mailgun event:', event.event);

    await processMailgunEvent(event);

    res.status(200).json({
      message: 'Mailgun event processed successfully'
    });

  } catch (error) {
    logger.error('Mailgun webhook processing error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// Helper function to process generic email events
async function processEmailEvent(event) {
  const { event_type, email, timestamp, message_id, campaign_name } = event;

  logger.info(`Processing ${event_type} event for ${email}`);

  // Here you would typically:
  // 1. Update database with event data
  // 2. Update campaign statistics
  // 3. Trigger follow-up actions if needed

  switch (event_type) {
    case 'delivered':
      logger.info(`Email delivered to ${email}`);
      break;
      
    case 'opened':
      logger.info(`Email opened by ${email}`);
      // Trigger hot lead notification
      await notifyHotLead(email, 'opened');
      break;
      
    case 'clicked':
      logger.info(`Email clicked by ${email}`);
      // Trigger hot lead notification
      await notifyHotLead(email, 'clicked');
      break;
      
    case 'replied':
      logger.info(`Email replied by ${email}`);
      // Analyze reply sentiment
      await analyzeReply(event);
      break;
      
    case 'bounced':
      logger.warn(`Email bounced for ${email}`);
      // Mark email as invalid
      break;
      
    case 'spam':
      logger.warn(`Email marked as spam by ${email}`);
      // Remove from future campaigns
      break;
      
    case 'unsubscribed':
      logger.info(`${email} unsubscribed`);
      // Add to suppression list
      break;
      
    default:
      logger.info(`Unknown event type: ${event_type}`);
  }
}

// Helper function to process SendGrid events
async function processSendGridEvent(event) {
  const mappedEvent = {
    event_type: event.event,
    email: event.email,
    timestamp: event.timestamp,
    message_id: event.sg_message_id,
    campaign_name: event.campaign_name || event.asm_group_id
  };

  await processEmailEvent(mappedEvent);
}

// Helper function to process Mailgun events
async function processMailgunEvent(event) {
  const mappedEvent = {
    event_type: event.event,
    email: event.recipient,
    timestamp: event.timestamp,
    message_id: event['message-id'],
    campaign_name: event.tag
  };

  await processEmailEvent(mappedEvent);
}

// Helper function to notify about hot leads
async function notifyHotLead(email, action) {
  try {
    logger.info(`Hot lead detected: ${email} - ${action}`);
    
    // Here you would typically:
    // 1. Update lead score in database
    // 2. Send WhatsApp notification
    // 3. Create task in CRM
    
    // For MVP, just log the hot lead
    const hotLeadData = {
      email,
      action,
      timestamp: new Date().toISOString(),
      score: action === 'clicked' ? 0.9 : 0.7
    };

    // TODO: Implement WhatsApp notification
    // await sendWhatsAppNotification(hotLeadData);
    
  } catch (error) {
    logger.error('Hot lead notification error:', error);
  }
}

// Helper function to analyze email replies
async function analyzeReply(event) {
  try {
    const { email, reply_text } = event;
    
    if (!reply_text) {
      logger.warn(`No reply text found for ${email}`);
      return;
    }

    // Call AI engine to analyze reply
    const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8001';
    
    const response = await fetch(`${AI_ENGINE_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        reply_text
      })
    });

    if (!response.ok) {
      throw new Error(`AI Engine error: ${response.statusText}`);
    }

    const analysis = await response.json();
    
    logger.info(`Reply analysis for ${email}:`, analysis);

    // Update lead status based on analysis
    if (analysis.intent === 'interested') {
      await notifyHotLead(email, 'replied_interested');
    }

  } catch (error) {
    logger.error('Reply analysis error:', error);
  }
}

module.exports = router;