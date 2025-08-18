"""
Advanced reply analysis module for ColdStorm.AI
Provides sentiment analysis, intent detection, and lead scoring based on email replies
"""

from textblob import TextBlob
import re
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

class ReplyAnalyzer:
    def __init__(self):
        # Intent patterns for classification
        self.intent_patterns = {
            'interested': [
                r'\b(interested|yes|sure|sounds good|let\'s talk|call me|schedule|meeting|demo|learn more)\b',
                r'\b(when|time|available|calendar|book|setup|arrange)\b',
                r'\b(tell me more|more information|details|curious|intrigued)\b'
            ],
            'not_interested': [
                r'\b(not interested|no thank you|no thanks|not right now|pass|remove|unsubscribe)\b',
                r'\b(busy|swamped|overwhelmed|no time|too busy)\b',
                r'\b(already have|current solution|satisfied with|working with)\b',
                r'\b(spam|unsolicited|stop|cease|do not contact)\b'
            ],
            'neutral': [
                r'\b(maybe|perhaps|possibly|might|consider|think about it)\b',
                r'\b(later|future|next year|not now|timing)\b',
                r'\b(budget|cost|price|expensive|cheap)\b'
            ],
            'request_info': [
                r'\b(more info|information|details|pricing|cost|how much)\b',
                r'\b(case study|references|examples|testimonials)\b',
                r'\b(features|capabilities|how it works|demo)\b'
            ]
        }
        
        # Urgency indicators
        self.urgency_patterns = [
            r'\b(urgent|asap|immediately|right away|soon|quickly)\b',
            r'\b(deadline|timeline|time sensitive|rush)\b'
        ]
        
        # Positive sentiment boosters
        self.positive_boosters = [
            'exactly what we need', 'perfect timing', 'great solution',
            'impressive', 'innovative', 'game changer', 'love it'
        ]
        
        # Negative sentiment indicators
        self.negative_indicators = [
            'waste of time', 'not relevant', 'wrong fit', 'disappointed',
            'frustrated', 'annoying', 'irritated', 'useless'
        ]

    def analyze_reply(self, reply_text: str, lead_email: str = None) -> Dict:
        """
        Comprehensive reply analysis
        
        Args:
            reply_text: The email reply content
            lead_email: Optional lead email for context
            
        Returns:
            Dict with analysis results
        """
        try:
            # Clean the text
            cleaned_text = self._clean_text(reply_text)
            
            # Basic sentiment analysis
            blob = TextBlob(cleaned_text)
            sentiment_score = blob.sentiment.polarity
            
            # Intent classification
            intent, intent_confidence = self._classify_intent(cleaned_text)
            
            # Sentiment classification with boosters
            sentiment = self._classify_sentiment(cleaned_text, sentiment_score)
            
            # Extract key phrases
            key_phrases = self._extract_key_phrases(cleaned_text)
            
            # Detect urgency
            urgency_level = self._detect_urgency(cleaned_text)
            
            # Calculate overall engagement score
            engagement_score = self._calculate_engagement_score(
                sentiment, intent, urgency_level, len(cleaned_text)
            )
            
            # Generate next action recommendation
            next_action = self._recommend_next_action(intent, sentiment, urgency_level)
            
            return {
                'sentiment': sentiment,
                'sentiment_score': round(sentiment_score, 2),
                'intent': intent,
                'intent_confidence': round(intent_confidence, 2),
                'key_phrases': key_phrases,
                'urgency_level': urgency_level,
                'engagement_score': round(engagement_score, 2),
                'next_action': next_action,
                'reply_length': len(reply_text),
                'word_count': len(cleaned_text.split())
            }
            
        except Exception as e:
            logger.error(f"Reply analysis error: {str(e)}")
            return self._get_default_analysis()

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text for analysis"""
        # Remove email signatures, headers, and quoted text
        lines = text.split('\n')
        cleaned_lines = []
        
        skip_patterns = [
            r'^On .* wrote:',  # Email thread headers
            r'^From:',         # Email headers
            r'^To:',
            r'^Subject:',
            r'^>',             # Quoted text
            r'--',             # Signature separator
            r'Best regards',   # Common signature starts
            r'Sincerely',
            r'Thanks',
            r'Sent from'       # Mobile signatures
        ]
        
        for line in lines:
            line = line.strip()
            if line and not any(re.match(pattern, line, re.IGNORECASE) for pattern in skip_patterns):
                cleaned_lines.append(line)
        
        return ' '.join(cleaned_lines).lower()

    def _classify_intent(self, text: str) -> Tuple[str, float]:
        """Classify the intent of the reply"""
        intent_scores = {}
        
        for intent, patterns in self.intent_patterns.items():
            score = 0
            matches = 0
            
            for pattern in patterns:
                pattern_matches = len(re.findall(pattern, text, re.IGNORECASE))
                matches += pattern_matches
                score += pattern_matches
            
            # Normalize score by number of patterns
            if patterns:
                intent_scores[intent] = score / len(patterns)
        
        if not intent_scores:
            return 'neutral', 0.5
        
        # Get the intent with highest score
        best_intent = max(intent_scores, key=intent_scores.get)
        confidence = min(intent_scores[best_intent], 1.0)
        
        # Boost confidence if multiple strong indicators
        if confidence > 0.5 and intent_scores[best_intent] >= 2:
            confidence = min(confidence + 0.2, 1.0)
        
        return best_intent, confidence

    def _classify_sentiment(self, text: str, base_score: float) -> str:
        """Enhanced sentiment classification"""
        # Check for boosters and indicators
        positive_boost = any(phrase in text for phrase in self.positive_boosters)
        negative_indicator = any(phrase in text for phrase in self.negative_indicators)
        
        # Adjust base score
        if positive_boost:
            base_score += 0.3
        if negative_indicator:
            base_score -= 0.3
        
        # Classify based on adjusted score
        if base_score > 0.1:
            return 'positive'
        elif base_score < -0.1:
            return 'negative'
        else:
            return 'neutral'

    def _extract_key_phrases(self, text: str) -> List[str]:
        """Extract important phrases from the reply"""
        # Simple keyword extraction
        important_words = [
            'budget', 'timeline', 'decision', 'team', 'boss', 'manager',
            'price', 'cost', 'expensive', 'cheap', 'affordable',
            'meeting', 'call', 'demo', 'trial', 'test',
            'interested', 'not interested', 'maybe', 'later',
            'competitor', 'alternative', 'current solution'
        ]
        
        found_phrases = []
        words = text.split()
        
        # Look for important single words
        for word in words:
            clean_word = re.sub(r'[^\w]', '', word.lower())
            if clean_word in important_words:
                found_phrases.append(clean_word)
        
        # Look for common phrases
        common_phrases = [
            'not right now', 'maybe later', 'sounds interesting',
            'tell me more', 'send information', 'schedule a call',
            'too expensive', 'already have', 'current vendor'
        ]
        
        for phrase in common_phrases:
            if phrase in text:
                found_phrases.append(phrase)
        
        return list(set(found_phrases))[:10]  # Limit to 10 unique phrases

    def _detect_urgency(self, text: str) -> str:
        """Detect urgency level in the reply"""
        urgency_matches = 0
        
        for pattern in self.urgency_patterns:
            urgency_matches += len(re.findall(pattern, text, re.IGNORECASE))
        
        if urgency_matches >= 2:
            return 'high'
        elif urgency_matches == 1:
            return 'medium'
        else:
            return 'low'

    def _calculate_engagement_score(self, sentiment: str, intent: str, urgency: str, text_length: int) -> float:
        """Calculate overall engagement score"""
        base_score = 0.5
        
        # Sentiment contribution
        if sentiment == 'positive':
            base_score += 0.3
        elif sentiment == 'negative':
            base_score -= 0.2
        
        # Intent contribution
        intent_scores = {
            'interested': 0.4,
            'request_info': 0.3,
            'neutral': 0.0,
            'not_interested': -0.3
        }
        base_score += intent_scores.get(intent, 0)
        
        # Urgency contribution
        urgency_scores = {
            'high': 0.2,
            'medium': 0.1,
            'low': 0.0
        }
        base_score += urgency_scores.get(urgency, 0)
        
        # Length contribution (longer replies often indicate more engagement)
        if text_length > 200:
            base_score += 0.1
        elif text_length < 50:
            base_score -= 0.1
        
        return max(0.0, min(1.0, base_score))

    def _recommend_next_action(self, intent: str, sentiment: str, urgency: str) -> str:
        """Recommend next action based on analysis"""
        if intent == 'interested' and sentiment == 'positive':
            if urgency == 'high':
                return 'immediate_followup'
            else:
                return 'schedule_meeting'
        
        elif intent == 'request_info':
            return 'send_information'
        
        elif intent == 'not_interested':
            if sentiment != 'negative':
                return 'nurture_campaign'
            else:
                return 'remove_from_campaign'
        
        elif intent == 'neutral' and sentiment == 'positive':
            return 'gentle_followup'
        
        elif sentiment == 'negative':
            return 'pause_outreach'
        
        else:
            return 'standard_followup'

    def _get_default_analysis(self) -> Dict:
        """Return default analysis when processing fails"""
        return {
            'sentiment': 'neutral',
            'sentiment_score': 0.0,
            'intent': 'neutral',
            'intent_confidence': 0.5,
            'key_phrases': [],
            'urgency_level': 'low',
            'engagement_score': 0.5,
            'next_action': 'standard_followup',
            'reply_length': 0,
            'word_count': 0
        }