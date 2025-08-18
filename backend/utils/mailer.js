const sgMail = require('@sendgrid/mail');
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const logger = require('./logger');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Mailgun
let mailgun = null;
if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
  const mg = new Mailgun(formData);
  mailgun = mg.client({
    username: 'api',
    key: process.env.MAILGUN_API_KEY
  });
}

/**
 * Send email using configured provider
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @param {Object} options.metadata - Additional metadata for tracking
 * @returns {Promise<Object>} - Email result
 */
async function sendEmail(options) {
  const { to, subject, html, text, metadata = {} } = options;

  // Validate required fields
  if (!to || !subject || !html) {
    throw new Error('Missing required email fields: to, subject, html');
  }

  // Try SendGrid first
  if (process.env.SENDGRID_API_KEY) {
    try {
      return await sendWithSendGrid(options);
    } catch (error) {
      logger.error('SendGrid failed, trying Mailgun:', error.message);
      
      // Fallback to Mailgun if available
      if (mailgun) {
        return await sendWithMailgun(options);
      }
      throw error;
    }
  }

  // Try Mailgun if SendGrid not configured
  if (mailgun) {
    return await sendWithMailgun(options);
  }

  // Fallback to SMTP (for development)
  if (process.env.NODE_ENV === 'development') {
    return await sendWithSMTP(options);
  }

  throw new Error('No email provider configured');
}

/**
 * Send email using SendGrid
 */
async function sendWithSendGrid(options) {
  const { to, subject, html, text, metadata = {} } = options;

  const msg = {
    to,
    from: {
      email: process.env.FROM_EMAIL || 'noreply@coldstorm.ai',
      name: process.env.FROM_NAME || 'ColdStorm.AI'
    },
    subject,
    html,
    text: text || stripHtml(html),
    customArgs: {
      campaign_name: metadata.campaign_name || 'default',
      lead_id: metadata.lead_id || to,
      template_type: metadata.template_type || 'cold_outreach'
    },
    trackingSettings: {
      clickTracking: {
        enable: true,
        enableText: false
      },
      openTracking: {
        enable: true,
        substitutionTag: '%open_track%'
      }
    }
  };

  const result = await sgMail.send(msg);
  
  logger.info(`Email sent via SendGrid to ${to}`);
  
  return {
    provider: 'sendgrid',
    messageId: result[0].headers['x-message-id'],
    status: 'sent'
  };
}

/**
 * Send email using Mailgun
 */
async function sendWithMailgun(options) {
  const { to, subject, html, text, metadata = {} } = options;

  const msg = {
    from: `${process.env.FROM_NAME || 'ColdStorm.AI'} <${process.env.FROM_EMAIL || 'noreply@coldstorm.ai'}>`,
    to,
    subject,
    html,
    text: text || stripHtml(html),
    'o:tag': [
      metadata.campaign_name || 'default',
      metadata.template_type || 'cold_outreach'
    ],
    'o:tracking': 'yes',
    'o:tracking-clicks': 'yes',
    'o:tracking-opens': 'yes',
    'v:lead_id': metadata.lead_id || to
  };

  const result = await mailgun.messages.create(process.env.MAILGUN_DOMAIN, msg);
  
  logger.info(`Email sent via Mailgun to ${to}`);
  
  return {
    provider: 'mailgun',
    messageId: result.id,
    status: 'sent'
  };
}

/**
 * Send email using SMTP (development fallback)
 */
async function sendWithSMTP(options) {
  const { to, subject, html } = options;
  
  // For development, just log the email
  logger.info('=== DEVELOPMENT EMAIL ===');
  logger.info(`To: ${to}`);
  logger.info(`Subject: ${subject}`);
  logger.info(`HTML: ${html.substring(0, 200)}...`);
  logger.info('=========================');
  
  return {
    provider: 'smtp-dev',
    messageId: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'sent'
  };
}

/**
 * Send bulk emails with rate limiting
 * @param {Array} emails - Array of email options
 * @param {number} rateLimit - Emails per second (default: 1)
 * @returns {Promise<Array>} - Array of results
 */
async function sendBulkEmails(emails, rateLimit = 1) {
  const results = [];
  const delay = 1000 / rateLimit; // Convert to milliseconds

  for (const emailOptions of emails) {
    try {
      const result = await sendEmail(emailOptions);
      results.push({ ...result, email: emailOptions.to });
      
      // Rate limiting delay
      if (emails.indexOf(emailOptions) < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error) {
      logger.error(`Failed to send email to ${emailOptions.to}:`, error.message);
      results.push({
        email: emailOptions.to,
        status: 'failed',
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} - Is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Strip HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} - Plain text
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Get email provider status
 * @returns {Object} - Provider status
 */
function getProviderStatus() {
  return {
    sendgrid: {
      configured: !!process.env.SENDGRID_API_KEY,
      available: !!process.env.SENDGRID_API_KEY
    },
    mailgun: {
      configured: !!(process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN),
      available: !!mailgun
    },
    smtp: {
      configured: true,
      available: process.env.NODE_ENV === 'development'
    }
  };
}

module.exports = {
  sendEmail,
  sendBulkEmails,
  isValidEmail,
  stripHtml,
  getProviderStatus
};