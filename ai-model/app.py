
from flask import Flask, request, jsonify
import os
import logging
import time
import json
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import joblib
import numpy as np
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

# Initialize Flask app
app = Flask(__name__)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('ai_model_requests_total', 'Total AI model requests', ['method', 'endpoint'])
REQUEST_LATENCY = Histogram('ai_model_request_duration_seconds', 'AI model request latency')
PREDICTION_COUNT = Counter('ai_model_predictions_total', 'Total predictions made', ['category'])

class LegalAssistantModel:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.knowledge_base = self.load_knowledge_base()
        self.load_model()
    
    def load_model(self):
        """Load the trained legal assistant model"""
        try:
            # Load your trained model here
            # For demo purposes, using a general language model
            model_path = os.getenv('MODEL_PATH', 'distilbert-base-uncased')
            
            logger.info(f"Loading model from {model_path}")
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            
            # If you have a custom trained model, load it here:
            # self.model = joblib.load('/app/models/legal_assistant_model.pkl')
            
            # For now, using a text generation pipeline
            self.model = pipeline(
                "text-generation",
                model=model_path,
                tokenizer=self.tokenizer,
                max_length=500,
                temperature=0.7
            )
            
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            raise
    
    def load_knowledge_base(self):
        """Load legal knowledge base for Cameroon"""
        return {
            "family_law": {
                "marriage": {
                    "legal_age": "The legal age for marriage in Cameroon is 18 for both men and women.",
                    "requirements": "Marriage requires consent of both parties, civil registration, and parental consent if under 21.",
                    "polygamy": "Polygamy is legal under customary law but not under civil law."
                },
                "divorce": {
                    "grounds": "Divorce can be granted on grounds of adultery, desertion, cruelty, or irretrievable breakdown.",
                    "procedure": "Divorce proceedings must be filed in the appropriate court with proper documentation.",
                    "custody": "Child custody is determined based on the best interests of the child."
                },
                "inheritance": {
                    "succession": "Inheritance follows civil law or customary law depending on the marriage type.",
                    "will": "A will must be properly witnessed and registered to be valid.",
                    "intestate": "If there's no will, inheritance follows legal succession rules."
                }
            },
            "criminal_law": {
                "theft": {
                    "definition": "Theft is the unlawful taking of another's property with intent to permanently deprive.",
                    "penalties": "Penalties range from fines to imprisonment depending on the value stolen.",
                    "procedure": "Theft cases are prosecuted by the state through criminal courts."
                },
                "assault": {
                    "definition": "Assault is the intentional application of force or threat of force against another person.",
                    "types": "Assault can be simple or aggravated depending on the circumstances.",
                    "penalties": "Penalties include fines and/or imprisonment based on severity."
                }
            },
            "property_law": {
                "land_ownership": {
                    "title": "Land ownership requires proper title registration with the land registry.",
                    "transfer": "Land transfer must be done through proper legal documentation and registration.",
                    "disputes": "Land disputes are handled by specialized land courts."
                },
                "rental": {
                    "rights": "Tenants have rights to peaceful enjoyment and proper notice for termination.",
                    "obligations": "Tenants must pay rent on time and maintain the property.",
                    "disputes": "Rental disputes can be resolved through mediation or court proceedings."
                }
            },
            "business_law": {
                "contracts": {
                    "formation": "Contracts require offer, acceptance, consideration, and legal capacity.",
                    "breach": "Contract breach can result in damages or specific performance orders.",
                    "termination": "Contracts can be terminated by performance, agreement, or breach."
                },
                "employment": {
                    "rights": "Employees have rights to fair wages, safe working conditions, and proper treatment.",
                    "termination": "Employment termination must follow proper procedures and notice periods.",
                    "discrimination": "Employment discrimination based on protected characteristics is prohibited."
                }
            }
        }
    
    def categorize_query(self, query):
        """Categorize the legal query"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['marriage', 'divorce', 'family', 'custody', 'inheritance', 'will']):
            return 'family_law'
        elif any(word in query_lower for word in ['theft', 'steal', 'assault', 'crime', 'criminal']):
            return 'criminal_law'
        elif any(word in query_lower for word in ['property', 'land', 'house', 'rent', 'lease']):
            return 'property_law'
        elif any(word in query_lower for word in ['business', 'contract', 'employment', 'work', 'job']):
            return 'business_law'
        else:
            return 'general'
    
    def generate_response(self, query):
        """Generate response for legal query"""
        try:
            category = self.categorize_query(query)
            PREDICTION_COUNT.labels(category=category).inc()
            
            # Search knowledge base first
            kb_response = self.search_knowledge_base(query, category)
            
            if kb_response:
                return f"{kb_response}\n\nPlease note: This is general legal information. For specific legal advice, consult with a qualified lawyer."
            
            # If no specific knowledge base match, use the model
            if self.model:
                prompt = f"Legal question about Cameroon law: {query}\n\nAnswer:"
                response = self.model(prompt, max_new_tokens=200, do_sample=True)
                
                if response and len(response) > 0:
                    generated_text = response[0]['generated_text']
                    # Extract just the answer part
                    answer = generated_text.split("Answer:")[-1].strip()
                    return f"{answer}\n\nPlease note: This is general legal information. For specific legal advice, consult with a qualified lawyer."
            
            # Fallback response
            return ("I understand you have a legal question. While I can provide general information about Cameroon law, "
                   "I recommend consulting with a qualified lawyer for specific legal advice. You can use our lawyer "
                   "directory to find specialists in your area of need.")
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            return ("I apologize, but I'm currently unable to process your question. Please try again later or "
                   "consult with one of our qualified lawyers through the lawyer directory.")
    
    def search_knowledge_base(self, query, category):
        """Search the knowledge base for relevant information"""
        if category == 'general':
            return None
            
        query_lower = query.lower()
        kb_section = self.knowledge_base.get(category, {})
        
        for topic, info in kb_section.items():
            if topic in query_lower:
                if isinstance(info, dict):
                    # Return the most relevant piece of information
                    for key, value in info.items():
                        if key in query_lower:
                            return value
                    # If no specific match, return the first item
                    return next(iter(info.values()))
                else:
                    return info
        
        return None

# Initialize model
legal_model = LegalAssistantModel()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": time.time()})

@app.route('/ready', methods=['GET'])
def readiness_check():
    """Readiness check endpoint"""
    if legal_model.model is not None:
        return jsonify({"status": "ready", "timestamp": time.time()})
    else:
        return jsonify({"status": "not ready", "timestamp": time.time()}), 503

@app.route('/predict', methods=['POST'])
@REQUEST_LATENCY.time()
def predict():
    """Main prediction endpoint"""
    REQUEST_COUNT.labels(method='POST', endpoint='/predict').inc()
    
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({"error": "Missing 'query' in request body"}), 400
        
        query = data['query']
        
        if not query.strip():
            return jsonify({"error": "Query cannot be empty"}), 400
        
        logger.info(f"Processing query: {query[:100]}...")
        
        # Generate response
        response = legal_model.generate_response(query)
        
        return jsonify({
            "response": response,
            "timestamp": time.time(),
            "query_id": f"{int(time.time() * 1000)}"
        })
        
    except Exception as e:
        logger.error(f"Error in predict endpoint: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return generate_latest(), 200, {'Content-Type': CONTENT_TYPE_LATEST}

@app.route('/model/info', methods=['GET'])
def model_info():
    """Get model information"""
    return jsonify({
        "model_loaded": legal_model.model is not None,
        "knowledge_base_categories": list(legal_model.knowledge_base.keys()),
        "version": "1.0.0"
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting AI model service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
