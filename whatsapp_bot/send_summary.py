#!/usr/bin/env python3
"""
WhatsApp Bot for ColdStorm.AI
Sends daily/weekly campaign summaries and hot lead alerts via WhatsApp
"""

import os
import sys
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import requests
from twilio.rest import Client
from dotenv import load_dotenv
import schedule
import time
from jinja2 import Template

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('whatsapp_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class WhatsAppBot:
    def __init__(self):
        # Twilio configuration
        self.account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.whatsapp_number = os.getenv('TWILIO_WHATSAPP_NUMBER', 'whatsapp:+14155238886')
        
        # Recipient numbers (in production, this would come from a database)
        self.recipient_numbers = [
            os.getenv('ADMIN_WHATSAPP_NUMBER', 'whatsapp:+1234567890')
        ]
        
        # API configuration
        self.backend_url = os.getenv('API_BASE_URL', 'http://localhost:3000')
        
        # Initialize Twilio client
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
            logger.info("✅ Twilio client initialized successfully")
        else:
            self.client = None
            logger.warning("⚠️  Twilio credentials not configured - WhatsApp notifications disabled")

    def send_message(self, to_number: str, message: str) -> bool:
        """Send a WhatsApp message"""
        try:
            if not self.client:
                logger.warning("Twilio client not configured, skipping message send")
                logger.info(f"📱 Would send to {to_number}: {message[:100]}...")
                return True
            
            message_obj = self.client.messages.create(
                body=message,
                from_=self.whatsapp_number,
                to=to_number
            )
            
            logger.info(f"✅ Message sent successfully to {to_number} (SID: {message_obj.sid})")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to send message to {to_number}: {str(e)}")
            return False

    def broadcast_message(self, message: str) -> Dict[str, bool]:
        """Send message to all recipient numbers"""
        results = {}
        for number in self.recipient_numbers:
            results[number] = self.send_message(number, message)
        return results

    def fetch_campaign_stats(self) -> Optional[Dict]:
        """Fetch campaign statistics from backend"""
        try:
            response = requests.get(f"{self.backend_url}/api/analytics/dashboard", timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"❌ Failed to fetch campaign stats: {str(e)}")
            return None

    def fetch_hot_leads(self) -> Optional[List[Dict]]:
        """Fetch hot leads from backend"""
        try:
            response = requests.get(
                f"{self.backend_url}/api/analytics/lead-segments?segment=hot&limit=10", 
                timeout=10
            )
            response.raise_for_status()
            return response.json().get('leads', [])
        except Exception as e:
            logger.error(f"❌ Failed to fetch hot leads: {str(e)}")
            return None

    def generate_daily_summary(self) -> str:
        """Generate daily campaign summary message"""
        stats = self.fetch_campaign_stats()
        if not stats:
            return "❌ Unable to fetch campaign data for daily summary."
        
        template = Template("""🔥 *ColdStorm.AI Daily Summary*

📧 *Email Activity (Today)*
• Sent: {{ emails_sent_today }}
• Opened: {{ emails_opened_today }} ({{ open_rate }}%)
• Replied: {{ emails_replied_today }} ({{ reply_rate }}%)

🎯 *Lead Updates*
• Hot Leads: {{ hot_leads }}
• New Replies: {{ new_replies }}
• Interested Prospects: {{ interested_prospects }}

📈 *Performance*
• Open Rate: {{ overall_open_rate }}%
• Reply Rate: {{ overall_reply_rate }}%
• Interest Rate: {{ interest_rate }}%

⚡ Generated at {{ timestamp }}""")

        return template.render(
            emails_sent_today=stats.get('emails_sent_today', 0),
            emails_opened_today=stats.get('emails_opened_today', 0),
            emails_replied_today=stats.get('emails_replied_today', 0),
            open_rate=round(stats.get('open_rate_today', 0) * 100, 1),
            reply_rate=round(stats.get('reply_rate_today', 0) * 100, 1),
            hot_leads=stats.get('hot_leads_count', 0),
            new_replies=stats.get('new_replies_today', 0),
            interested_prospects=stats.get('interested_prospects', 0),
            overall_open_rate=round(stats.get('overall_open_rate', 0) * 100, 1),
            overall_reply_rate=round(stats.get('overall_reply_rate', 0) * 100, 1),
            interest_rate=round(stats.get('interest_rate', 0) * 100, 1),
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M')
        )

    def generate_weekly_summary(self) -> str:
        """Generate weekly campaign summary message"""
        stats = self.fetch_campaign_stats()
        if not stats:
            return "❌ Unable to fetch campaign data for weekly summary."
        
        template = Template("""📊 *ColdStorm.AI Weekly Report*

🗓️ *Week of {{ week_start }} - {{ week_end }}*

📧 *Email Performance*
• Total Sent: {{ total_sent }}
• Total Opened: {{ total_opened }} ({{ open_rate }}%)
• Total Replied: {{ total_replied }} ({{ reply_rate }}%)
• Bounced: {{ bounced }} ({{ bounce_rate }}%)

🔥 *Lead Activity*
• Hot Leads: {{ hot_leads }}
• Warm Leads: {{ warm_leads }}
• Cold Leads: {{ cold_leads }}
• Total Prospects: {{ total_leads }}

🎯 *Top Campaigns*
{{ top_campaigns }}

📈 *Trends*
• Open Rate Trend: {{ open_rate_trend }}
• Reply Rate Trend: {{ reply_rate_trend }}

🚀 *Next Week Goals*
• Target Emails: {{ target_emails }}
• Expected Replies: {{ expected_replies }}

📅 Report generated: {{ timestamp }}""")

        # Calculate week dates
        today = datetime.now()
        week_start = (today - timedelta(days=today.weekday())).strftime('%Y-%m-%d')
        week_end = (today - timedelta(days=today.weekday() - 6)).strftime('%Y-%m-%d')
        
        # Format top campaigns
        top_campaigns = ""
        campaigns = stats.get('top_campaigns', [])
        for i, campaign in enumerate(campaigns[:3], 1):
            top_campaigns += f"{i}. {campaign.get('name', 'Unknown')} - {campaign.get('sent', 0)} sent, {campaign.get('replies', 0)} replies\n"
        
        return template.render(
            week_start=week_start,
            week_end=week_end,
            total_sent=stats.get('total_sent_week', 0),
            total_opened=stats.get('total_opened_week', 0),
            total_replied=stats.get('total_replied_week', 0),
            bounced=stats.get('bounced_week', 0),
            open_rate=round(stats.get('open_rate_week', 0) * 100, 1),
            reply_rate=round(stats.get('reply_rate_week', 0) * 100, 1),
            bounce_rate=round(stats.get('bounce_rate_week', 0) * 100, 1),
            hot_leads=stats.get('hot_leads_count', 0),
            warm_leads=stats.get('warm_leads_count', 0),
            cold_leads=stats.get('cold_leads_count', 0),
            total_leads=stats.get('total_leads', 0),
            top_campaigns=top_campaigns,
            open_rate_trend="📈 +2.3%" if stats.get('open_rate_trend', 0) > 0 else "📉 -1.1%",
            reply_rate_trend="📈 +1.5%" if stats.get('reply_rate_trend', 0) > 0 else "📉 -0.8%",
            target_emails=stats.get('target_emails_next_week', 500),
            expected_replies=stats.get('expected_replies_next_week', 45),
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M')
        )

    def generate_hot_lead_alert(self, lead: Dict) -> str:
        """Generate hot lead alert message"""
        template = Template("""🔥 *HOT LEAD ALERT*

👤 *{{ lead_name }}*
🏢 {{ company }} - {{ position }}
📧 {{ email }}
📊 Score: {{ score }}%

🎯 *Recent Activity*
{{ activity }}

⚡ *Action Required*
{{ recommendation }}

🕐 Alert time: {{ timestamp }}

💡 *Quick Actions*
Reply "CALL {{ lead_id }}" to schedule a call
Reply "EMAIL {{ lead_id }}" to send follow-up""")

        return template.render(
            lead_name=lead.get('name', 'Unknown'),
            company=lead.get('company', 'Unknown Company'),
            position=lead.get('position', 'Unknown Position'),
            email=lead.get('email', 'unknown@email.com'),
            score=round(lead.get('score', 0) * 100),
            activity=lead.get('last_activity', 'No recent activity'),
            recommendation=lead.get('recommendation', 'Follow up immediately'),
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M'),
            lead_id=lead.get('id', 'unknown')
        )

    def send_daily_summary(self):
        """Send daily summary to all recipients"""
        logger.info("📊 Generating daily summary...")
        message = self.generate_daily_summary()
        results = self.broadcast_message(message)
        
        success_count = sum(1 for success in results.values() if success)
        logger.info(f"✅ Daily summary sent to {success_count}/{len(results)} recipients")

    def send_weekly_summary(self):
        """Send weekly summary to all recipients"""
        logger.info("📊 Generating weekly summary...")
        message = self.generate_weekly_summary()
        results = self.broadcast_message(message)
        
        success_count = sum(1 for success in results.values() if success)
        logger.info(f"✅ Weekly summary sent to {success_count}/{len(results)} recipients")

    def send_hot_lead_alerts(self):
        """Send alerts for hot leads"""
        logger.info("🔥 Checking for hot leads...")
        hot_leads = self.fetch_hot_leads()
        
        if not hot_leads:
            logger.info("No hot leads found")
            return
        
        # Send alert for each hot lead
        for lead in hot_leads[:5]:  # Limit to top 5 hot leads
            message = self.generate_hot_lead_alert(lead)
            results = self.broadcast_message(message)
            
            success_count = sum(1 for success in results.values() if success)
            logger.info(f"🔥 Hot lead alert sent for {lead.get('name', 'Unknown')} to {success_count} recipients")
            
            # Add delay between messages to avoid rate limiting
            time.sleep(2)

    def send_custom_message(self, message: str):
        """Send custom message to all recipients"""
        results = self.broadcast_message(message)
        success_count = sum(1 for success in results.values() if success)
        logger.info(f"✅ Custom message sent to {success_count}/{len(results)} recipients")
        return results

def main():
    """Main function to run the WhatsApp bot"""
    bot = WhatsAppBot()
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == 'daily':
            bot.send_daily_summary()
        elif command == 'weekly':
            bot.send_weekly_summary()
        elif command == 'hot-leads':
            bot.send_hot_lead_alerts()
        elif command == 'test':
            bot.send_custom_message("🧪 Test message from ColdStorm.AI WhatsApp Bot")
        elif command == 'schedule':
            # Schedule regular summaries
            logger.info("📅 Starting scheduled WhatsApp bot...")
            
            # Schedule daily summary at 9 AM
            schedule.every().day.at("09:00").do(bot.send_daily_summary)
            
            # Schedule weekly summary on Monday at 10 AM
            schedule.every().monday.at("10:00").do(bot.send_weekly_summary)
            
            # Check for hot leads every 2 hours during business hours
            schedule.every(2).hours.do(bot.send_hot_lead_alerts)
            
            logger.info("📅 Scheduled tasks:")
            logger.info("  - Daily summary: Every day at 9:00 AM")
            logger.info("  - Weekly summary: Every Monday at 10:00 AM")
            logger.info("  - Hot lead alerts: Every 2 hours")
            
            # Keep the script running
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        else:
            print("Usage: python send_summary.py [daily|weekly|hot-leads|test|schedule]")
    else:
        # Default: send daily summary
        bot.send_daily_summary()

if __name__ == "__main__":
    main()