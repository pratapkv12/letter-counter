"""
Advanced targeting and lead scoring logic for ColdStorm.AI
Provides sophisticated lead qualification and targeting recommendations
"""

import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class Lead:
    name: str
    email: str
    company: str
    position: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None

@dataclass
class ScoringResult:
    overall_score: float
    category_scores: Dict[str, float]
    recommendation: str
    priority_level: str
    reasoning: List[str]

class TargetingEngine:
    def __init__(self):
        # Industry scoring weights
        self.industry_scores = {
            'technology': 0.95,
            'software': 0.95,
            'saas': 1.0,
            'fintech': 0.9,
            'healthcare': 0.85,
            'consulting': 0.8,
            'marketing': 0.8,
            'e-commerce': 0.85,
            'manufacturing': 0.7,
            'retail': 0.65,
            'education': 0.6,
            'government': 0.4,
            'non-profit': 0.3
        }
        
        # Position scoring (decision-making power)
        self.position_scores = {
            # C-Level
            'ceo': 1.0, 'cto': 1.0, 'cfo': 0.95, 'coo': 0.95, 'cmo': 0.9,
            'chief': 0.95, 'president': 1.0, 'founder': 1.0, 'owner': 1.0,
            
            # VP Level
            'vp': 0.85, 'vice president': 0.85, 'svp': 0.9,
            
            # Director Level
            'director': 0.75, 'head': 0.8, 'lead': 0.7,
            
            # Manager Level
            'manager': 0.6, 'senior manager': 0.65, 'team lead': 0.6,
            
            # Individual Contributors
            'senior': 0.45, 'principal': 0.5, 'staff': 0.4,
            'engineer': 0.35, 'developer': 0.35, 'analyst': 0.4,
            'specialist': 0.4, 'coordinator': 0.3, 'associate': 0.25
        }
        
        # Company size indicators (based on common patterns)
        self.company_size_patterns = {
            'enterprise': ['fortune 500', 'global', 'multinational', 'enterprise', 'corporation'],
            'large': ['inc', 'corp', 'ltd', 'llc', 'group', 'international'],
            'medium': ['company', 'solutions', 'services', 'systems'],
            'startup': ['startup', 'labs', 'studio', 'ventures', 'tech']
        }
        
        # Email domain scoring
        self.domain_scores = {
            'enterprise': 0.9,  # Custom domain
            'business': 0.7,    # Business email providers
            'personal': 0.2     # Personal email providers
        }
        
        # Personal email domains
        self.personal_domains = {
            'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
            'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
        }
        
        # Business email providers
        self.business_domains = {
            'gsuite.com', 'office365.com', 'zoho.com', 'fastmail.com'
        }

    def score_lead(self, lead: Lead) -> ScoringResult:
        """
        Comprehensive lead scoring algorithm
        
        Returns a score from 0.0 to 1.0 with detailed breakdown
        """
        try:
            category_scores = {}
            reasoning = []
            
            # 1. Email Domain Analysis (25% weight)
            domain_score, domain_reason = self._score_email_domain(lead.email)
            category_scores['email_domain'] = domain_score
            reasoning.append(domain_reason)
            
            # 2. Position/Title Analysis (30% weight)
            position_score, position_reason = self._score_position(lead.position)
            category_scores['position'] = position_score
            reasoning.append(position_reason)
            
            # 3. Industry Analysis (20% weight)
            industry_score, industry_reason = self._score_industry(lead.industry)
            category_scores['industry'] = industry_score
            reasoning.append(industry_reason)
            
            # 4. Company Analysis (15% weight)
            company_score, company_reason = self._score_company(lead.company, lead.website)
            category_scores['company'] = company_score
            reasoning.append(company_reason)
            
            # 5. Data Completeness (10% weight)
            completeness_score, completeness_reason = self._score_data_completeness(lead)
            category_scores['data_quality'] = completeness_score
            reasoning.append(completeness_reason)
            
            # Calculate weighted overall score
            weights = {
                'email_domain': 0.25,
                'position': 0.30,
                'industry': 0.20,
                'company': 0.15,
                'data_quality': 0.10
            }
            
            overall_score = sum(
                category_scores[category] * weight
                for category, weight in weights.items()
            )
            
            # Determine priority level and recommendation
            priority_level, recommendation = self._get_priority_and_recommendation(
                overall_score, category_scores
            )
            
            return ScoringResult(
                overall_score=round(overall_score, 3),
                category_scores=category_scores,
                recommendation=recommendation,
                priority_level=priority_level,
                reasoning=reasoning
            )
            
        except Exception as e:
            logger.error(f"Lead scoring error: {str(e)}")
            return self._get_default_scoring_result()

    def _score_email_domain(self, email: str) -> Tuple[float, str]:
        """Score based on email domain type"""
        if not email or '@' not in email:
            return 0.1, "Invalid or missing email address"
        
        domain = email.split('@')[1].lower()
        
        if domain in self.personal_domains:
            return 0.2, f"Personal email domain ({domain}) - lower business intent"
        
        if domain in self.business_domains:
            return 0.7, f"Business email provider ({domain}) - good business intent"
        
        # Custom domain - likely business email
        return 0.9, f"Custom business domain ({domain}) - high business intent"

    def _score_position(self, position: str) -> Tuple[float, str]:
        """Score based on position/title"""
        if not position:
            return 0.3, "Position not specified - unknown decision-making power"
        
        position_lower = position.lower()
        
        # Find the best matching position score
        best_score = 0.3  # Default for unknown positions
        matched_title = None
        
        for title, score in self.position_scores.items():
            if title in position_lower:
                if score > best_score:
                    best_score = score
                    matched_title = title
        
        if matched_title:
            if best_score >= 0.8:
                return best_score, f"High-level position ({matched_title}) - strong decision-making power"
            elif best_score >= 0.6:
                return best_score, f"Management position ({matched_title}) - good decision influence"
            else:
                return best_score, f"Individual contributor ({matched_title}) - limited decision power"
        else:
            return 0.3, f"Unknown position type ({position}) - unclear decision-making power"

    def _score_industry(self, industry: str) -> Tuple[float, str]:
        """Score based on industry vertical"""
        if not industry:
            return 0.5, "Industry not specified - unknown market fit"
        
        industry_lower = industry.lower()
        
        # Find best matching industry
        best_score = 0.5  # Default for unknown industries
        matched_industry = None
        
        for industry_key, score in self.industry_scores.items():
            if industry_key in industry_lower:
                if score > best_score:
                    best_score = score
                    matched_industry = industry_key
        
        if matched_industry:
            if best_score >= 0.8:
                return best_score, f"High-value industry ({matched_industry}) - excellent market fit"
            elif best_score >= 0.6:
                return best_score, f"Good industry match ({matched_industry}) - solid market fit"
            else:
                return best_score, f"Lower-priority industry ({matched_industry}) - limited market fit"
        else:
            return 0.5, f"Industry ({industry}) not in high-priority verticals"

    def _score_company(self, company: str, website: str) -> Tuple[float, str]:
        """Score based on company characteristics"""
        if not company:
            return 0.2, "Company name not provided"
        
        score = 0.5  # Base score
        reasons = []
        
        company_lower = company.lower()
        
        # Check for company size indicators
        company_size = self._estimate_company_size(company_lower)
        
        if company_size == 'enterprise':
            score += 0.3
            reasons.append("likely enterprise company")
        elif company_size == 'large':
            score += 0.2
            reasons.append("appears to be established company")
        elif company_size == 'startup':
            score += 0.1
            reasons.append("appears to be startup/tech company")
        
        # Website presence
        if website:
            score += 0.2
            reasons.append("has company website")
        
        # Company name quality indicators
        if len(company) > 3 and not any(char.isdigit() for char in company):
            score += 0.1
            reasons.append("professional company name")
        
        reason_text = f"Company analysis: {', '.join(reasons) if reasons else 'standard company profile'}"
        
        return min(score, 1.0), reason_text

    def _score_data_completeness(self, lead: Lead) -> Tuple[float, str]:
        """Score based on data quality and completeness"""
        fields = [lead.name, lead.email, lead.company, lead.position, lead.industry, lead.website]
        filled_fields = sum(1 for field in fields if field and field.strip())
        
        completeness_ratio = filled_fields / len(fields)
        
        if completeness_ratio >= 0.8:
            return 0.9, f"Excellent data quality ({filled_fields}/{len(fields)} fields complete)"
        elif completeness_ratio >= 0.6:
            return 0.7, f"Good data quality ({filled_fields}/{len(fields)} fields complete)"
        elif completeness_ratio >= 0.4:
            return 0.5, f"Fair data quality ({filled_fields}/{len(fields)} fields complete)"
        else:
            return 0.3, f"Poor data quality ({filled_fields}/{len(fields)} fields complete)"

    def _estimate_company_size(self, company_name: str) -> str:
        """Estimate company size based on name patterns"""
        for size, patterns in self.company_size_patterns.items():
            if any(pattern in company_name for pattern in patterns):
                return size
        return 'medium'  # Default

    def _get_priority_and_recommendation(self, overall_score: float, category_scores: Dict[str, float]) -> Tuple[str, str]:
        """Determine priority level and recommendation"""
        if overall_score >= 0.8:
            priority = "high"
            recommendation = "Immediate outreach - high-value prospect with strong fit indicators"
        elif overall_score >= 0.6:
            priority = "medium"
            recommendation = "Priority outreach - good prospect worth pursuing"
        elif overall_score >= 0.4:
            priority = "low"
            recommendation = "Standard outreach - include in regular campaigns"
        else:
            priority = "very_low"
            recommendation = "Low priority - consider excluding or nurture campaign only"
        
        # Adjust based on specific factors
        if category_scores.get('position', 0) >= 0.8 and category_scores.get('email_domain', 0) >= 0.7:
            if priority == "medium":
                priority = "high"
                recommendation = "Elevated to high priority - decision maker with business email"
        
        return priority, recommendation

    def _get_default_scoring_result(self) -> ScoringResult:
        """Return default result when scoring fails"""
        return ScoringResult(
            overall_score=0.5,
            category_scores={
                'email_domain': 0.5,
                'position': 0.5,
                'industry': 0.5,
                'company': 0.5,
                'data_quality': 0.5
            },
            recommendation="Standard outreach - default scoring due to processing error",
            priority_level="medium",
            reasoning=["Default scoring applied due to analysis error"]
        )

    def segment_leads(self, leads: List[Lead]) -> Dict[str, List[Tuple[Lead, ScoringResult]]]:
        """
        Segment leads into different categories for targeted campaigns
        
        Returns:
            Dict with segments: hot, warm, cold, nurture
        """
        segments = {
            'hot': [],      # Score >= 0.8
            'warm': [],     # Score 0.6-0.79
            'cold': [],     # Score 0.4-0.59
            'nurture': []   # Score < 0.4
        }
        
        for lead in leads:
            result = self.score_lead(lead)
            
            if result.overall_score >= 0.8:
                segments['hot'].append((lead, result))
            elif result.overall_score >= 0.6:
                segments['warm'].append((lead, result))
            elif result.overall_score >= 0.4:
                segments['cold'].append((lead, result))
            else:
                segments['nurture'].append((lead, result))
        
        return segments

    def recommend_campaign_strategy(self, segments: Dict[str, List]) -> Dict[str, str]:
        """Recommend campaign strategies for each segment"""
        return {
            'hot': "Immediate personalized outreach with phone follow-up. Use direct, value-focused messaging.",
            'warm': "Personalized email sequence with case studies and social proof. Follow up within 3-5 days.",
            'cold': "Standard cold email sequence with industry-specific messaging. 7-day follow-up cadence.",
            'nurture': "Educational content and long-term nurture sequence. Monthly touchpoints with valuable insights."
        }