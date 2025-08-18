from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import openai
import os
from dotenv import load_dotenv
import logging
from jinja2 import Template
import json

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

app = FastAPI(
    title="ColdStorm.AI Engine",
    description="AI-powered email generation and analysis microservice",
    version="1.0.0"
)

# Pydantic models
class Lead(BaseModel):
    name: str
    email: EmailStr
    company: str
    position: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None

class EmailGenerationRequest(BaseModel):
    lead: Lead
    template_type: str = "cold_outreach"
    campaign_name: str
    custom_message: Optional[str] = None

class EmailGenerationResponse(BaseModel):
    subject: str
    body: str
    personalization_score: float

class LeadScoringRequest(BaseModel):
    lead: Lead

class LeadScoringResponse(BaseModel):
    score: float
    factors: Dict[str, Any]
    recommendation: str

class ReplyAnalysisRequest(BaseModel):
    email: EmailStr
    reply_text: str

class ReplyAnalysisResponse(BaseModel):
    sentiment: str
    intent: str
    confidence: float
    key_phrases: list

# Email templates
EMAIL_TEMPLATES = {
    "cold_outreach": {
        "subject_template": "Quick question about {{company}}'s {{industry}} strategy",
        "body_template": """Hi {{name}},

I noticed {{company}} is doing interesting work in {{industry}}. As someone in {{position}}, you might find this relevant.

{{personalized_insight}}

Would you be open to a brief chat about how we're helping similar companies streamline their processes?

Best regards,
{{sender_name}}
{{sender_company}}

P.S. {{ps_message}}"""
    },
    "follow_up": {
        "subject_template": "Re: {{company}} - Following up",
        "body_template": """Hi {{name}},

I wanted to follow up on my previous message about {{company}}'s {{industry}} initiatives.

{{follow_up_reason}}

Would next week work for a 15-minute call?

Best,
{{sender_name}}"""
    },
    "custom": {
        "subject_template": "{{custom_subject}}",
        "body_template": "{{custom_body}}"
    }
}

@app.get("/")
async def root():
    return {
        "message": "ColdStorm.AI Engine is running",
        "version": "1.0.0",
        "endpoints": ["/generate", "/score", "/analyze"]
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai_configured": bool(openai.api_key),
        "service": "ai_engine"
    }

@app.post("/generate", response_model=EmailGenerationResponse)
async def generate_email(request: EmailGenerationRequest):
    """Generate personalized email content using AI"""
    try:
        logger.info(f"Generating email for {request.lead.email} - Campaign: {request.campaign_name}")
        
        # Get base template
        template_config = EMAIL_TEMPLATES.get(request.template_type, EMAIL_TEMPLATES["cold_outreach"])
        
        # Generate personalized content using OpenAI
        personalized_content = await generate_personalized_content(request.lead, request.template_type)
        
        # Create template variables
        template_vars = {
            "name": request.lead.name,
            "company": request.lead.company,
            "position": request.lead.position or "team member",
            "industry": request.lead.industry or "your industry",
            "website": request.lead.website or "",
            "sender_name": "Sarah Chen",
            "sender_company": "ColdStorm.AI",
            "personalized_insight": personalized_content.get("insight", ""),
            "ps_message": personalized_content.get("ps_message", ""),
            "follow_up_reason": personalized_content.get("follow_up_reason", ""),
            "custom_subject": request.custom_message or "",
            "custom_body": request.custom_message or ""
        }
        
        # Render templates
        subject_template = Template(template_config["subject_template"])
        body_template = Template(template_config["body_template"])
        
        subject = subject_template.render(**template_vars)
        body = body_template.render(**template_vars)
        
        # Calculate personalization score
        personalization_score = calculate_personalization_score(request.lead, personalized_content)
        
        return EmailGenerationResponse(
            subject=subject,
            body=body,
            personalization_score=personalization_score
        )
        
    except Exception as e:
        logger.error(f"Email generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Email generation failed: {str(e)}")

@app.post("/score", response_model=LeadScoringResponse)
async def score_lead(request: LeadScoringRequest):
    """Score lead quality and potential"""
    try:
        logger.info(f"Scoring lead: {request.lead.email}")
        
        lead = request.lead
        score = 0.0
        factors = {}
        
        # Company domain scoring
        if lead.email and "@" in lead.email:
            domain = lead.email.split("@")[1].lower()
            if domain in ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]:
                factors["email_domain"] = {"score": 0.3, "reason": "Personal email domain"}
                score += 0.3
            else:
                factors["email_domain"] = {"score": 0.8, "reason": "Business email domain"}
                score += 0.8
        
        # Position scoring
        if lead.position:
            position_lower = lead.position.lower()
            if any(title in position_lower for title in ["ceo", "founder", "president", "owner"]):
                factors["position"] = {"score": 1.0, "reason": "C-level or founder"}
                score += 1.0
            elif any(title in position_lower for title in ["director", "vp", "head", "manager"]):
                factors["position"] = {"score": 0.8, "reason": "Management level"}
                score += 0.8
            else:
                factors["position"] = {"score": 0.5, "reason": "Individual contributor"}
                score += 0.5
        
        # Company website scoring
        if lead.website:
            factors["website"] = {"score": 0.7, "reason": "Has company website"}
            score += 0.7
        
        # Industry scoring
        if lead.industry:
            high_value_industries = ["technology", "saas", "software", "fintech", "healthcare"]
            if any(ind in lead.industry.lower() for ind in high_value_industries):
                factors["industry"] = {"score": 0.9, "reason": "High-value industry"}
                score += 0.9
            else:
                factors["industry"] = {"score": 0.6, "reason": "Standard industry"}
                score += 0.6
        
        # Normalize score (max possible is ~4.2, normalize to 0-1)
        final_score = min(score / 4.2, 1.0)
        
        # Generate recommendation
        if final_score >= 0.8:
            recommendation = "High priority - immediate outreach recommended"
        elif final_score >= 0.6:
            recommendation = "Medium priority - good prospect for outreach"
        elif final_score >= 0.4:
            recommendation = "Low priority - consider nurture campaign"
        else:
            recommendation = "Very low priority - may not be worth pursuing"
        
        return LeadScoringResponse(
            score=round(final_score, 2),
            factors=factors,
            recommendation=recommendation
        )
        
    except Exception as e:
        logger.error(f"Lead scoring error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Lead scoring failed: {str(e)}")

@app.post("/analyze", response_model=ReplyAnalysisResponse)
async def analyze_reply(request: ReplyAnalysisRequest):
    """Analyze email reply sentiment and intent"""
    try:
        logger.info(f"Analyzing reply from {request.email}")
        
        reply_text = request.reply_text.lower()
        
        # Simple sentiment analysis (in production, use more sophisticated NLP)
        positive_words = ["interested", "yes", "sure", "sounds good", "let's talk", "call me", "schedule", "meeting"]
        negative_words = ["not interested", "no thank you", "remove", "unsubscribe", "stop", "spam", "busy"]
        neutral_words = ["maybe", "later", "think about it", "consider"]
        
        positive_count = sum(1 for word in positive_words if word in reply_text)
        negative_count = sum(1 for word in negative_words if word in reply_text)
        neutral_count = sum(1 for word in neutral_words if word in reply_text)
        
        # Determine sentiment
        if positive_count > negative_count and positive_count > neutral_count:
            sentiment = "positive"
            intent = "interested"
            confidence = min(0.6 + (positive_count * 0.1), 0.95)
        elif negative_count > positive_count:
            sentiment = "negative"
            intent = "not_interested"
            confidence = min(0.6 + (negative_count * 0.1), 0.95)
        else:
            sentiment = "neutral"
            intent = "neutral"
            confidence = 0.5
        
        # Extract key phrases
        key_phrases = []
        for word in positive_words + negative_words + neutral_words:
            if word in reply_text:
                key_phrases.append(word)
        
        return ReplyAnalysisResponse(
            sentiment=sentiment,
            intent=intent,
            confidence=round(confidence, 2),
            key_phrases=key_phrases[:5]  # Limit to top 5
        )
        
    except Exception as e:
        logger.error(f"Reply analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Reply analysis failed: {str(e)}")

async def generate_personalized_content(lead: Lead, template_type: str) -> Dict[str, str]:
    """Generate personalized content using OpenAI GPT-4"""
    try:
        if not openai.api_key:
            logger.warning("OpenAI API key not configured, using fallback content")
            return generate_fallback_content(lead, template_type)
        
        prompt = f"""
        Generate personalized email content for a cold outreach campaign.
        
        Lead Information:
        - Name: {lead.name}
        - Company: {lead.company}
        - Position: {lead.position or 'Not specified'}
        - Industry: {lead.industry or 'Not specified'}
        - Website: {lead.website or 'Not specified'}
        
        Template Type: {template_type}
        
        Please provide:
        1. A personalized insight about their company or industry (1-2 sentences)
        2. A relevant P.S. message
        3. If follow-up: A reason for following up
        
        Return as JSON with keys: insight, ps_message, follow_up_reason
        Keep it professional, concise, and relevant.
        """
        
        response = await openai.ChatCompletion.acreate(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert cold email writer who creates highly personalized, professional outreach messages."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.7
        )
        
        content = response.choices[0].message.content
        
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.warning("Failed to parse OpenAI response as JSON, using fallback")
            return generate_fallback_content(lead, template_type)
            
    except Exception as e:
        logger.error(f"OpenAI content generation error: {str(e)}")
        return generate_fallback_content(lead, template_type)

def generate_fallback_content(lead: Lead, template_type: str) -> Dict[str, str]:
    """Generate fallback content when OpenAI is not available"""
    insights = [
        f"I see {lead.company} is making waves in the {lead.industry or 'industry'} space.",
        f"Your work at {lead.company} caught my attention, especially in {lead.industry or 'your field'}.",
        f"I've been following {lead.company}'s growth and am impressed by your approach."
    ]
    
    ps_messages = [
        "I keep this brief - I know your time is valuable.",
        "No lengthy demos, just a quick conversation.",
        "Happy to share some insights even if we don't work together."
    ]
    
    follow_up_reasons = [
        "I realized my timing might have been off with my last message.",
        "I came across some new insights that might be relevant to your work at {lead.company}.",
        "I wanted to make sure my previous message didn't get lost in your inbox."
    ]
    
    import random
    return {
        "insight": random.choice(insights),
        "ps_message": random.choice(ps_messages),
        "follow_up_reason": random.choice(follow_up_reasons)
    }

def calculate_personalization_score(lead: Lead, content: Dict[str, str]) -> float:
    """Calculate how personalized the email content is"""
    score = 0.5  # Base score
    
    # Check if company name is used
    if lead.company.lower() in content.get("insight", "").lower():
        score += 0.2
    
    # Check if industry is mentioned
    if lead.industry and lead.industry.lower() in content.get("insight", "").lower():
        score += 0.2
    
    # Check if position is relevant
    if lead.position and any(word in content.get("insight", "").lower() for word in lead.position.lower().split()):
        score += 0.1
    
    return min(score, 1.0)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)