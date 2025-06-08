# LawHelp - Cameroon Legal Assistant

A comprehensive legal assistance platform for Cameroonians built with React, TypeScript, Supabase, and a microservice architecture.

## 🚀 Features

- **AI-Powered Legal Assistance**: Get instant answers to common legal questions about Cameroon law
- **Secure Authentication**: Multi-factor authentication with email and TOTP support
- **Real-time Chat**: Interactive chat interface with legal knowledge base
- **User Management**: Complete user profile and session management
- **Microservice Architecture**: Scalable backend with dedicated services
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark/Light Theme**: User preference-based theming

## 🏗️ Architecture

This application follows a microservice architecture pattern with the following services:

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **Supabase** for database and real-time features

### Backend Services
1. **Auth Service** (Port 3001) - Authentication and authorization
2. **User Service** (Port 3002) - User profile management
3. **Chat Service** (Port 3003) - Chat sessions and messaging
4. **Notification Service** (Port 3004) - Email and push notifications
5. **API Gateway** (Port 3000) - Request routing and rate limiting

### Database
- **Supabase (PostgreSQL)** - Primary database with RLS
- **Redis** - Caching and session storage

## 🛠️ Technology Stack

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite
- Lucide Icons
- Marked (Markdown rendering)

### Backend
- Node.js
- Express.js
- Supabase
- Redis
- SendGrid (Email)
- JWT Authentication
- bcrypt (Password hashing)
- OTPLIB (TOTP)

### Security
- Row Level Security (RLS)
- JWT tokens
- Rate limiting
- Input validation
- Password hashing
- Two-factor authentication

## 📋 Prerequisites

- Node.js 18 or higher
- npm or yarn
- Supabase account
- SendGrid account (for emails)
- Redis instance

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd legal-assistant-copy
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# SendGrid for email 2FA
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@lawhelp.cm

# JWT Secret
JWT_SECRET=your-jwt-secret-key

# Environment
NODE_ENV=development

# Microservice URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
CHAT_SERVICE_URL=http://localhost:3003
NOTIFICATION_SERVICE_URL=http://localhost:3004
```

### 4. Database Setup

1. Create a new Supabase project
2. Run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Update your environment variables with Supabase credentials

### 5. Start the Development Server

For frontend only:
```bash
npm run dev
```

For full microservice stack:
```bash
docker-compose up
```

## 🔐 Authentication

The application supports multiple authentication methods:

### Standard Login
- Email and password authentication
- Secure password hashing with bcrypt

### Two-Factor Authentication (2FA)
1. **Email-based 2FA**: Verification codes sent via email
2. **TOTP (Time-based One-Time Password)**: Compatible with:
   - Google Authenticator
   - Authy
   - Microsoft Authenticator
   - Any TOTP-compatible app

### Security Features
- JWT tokens with 7-day expiration
- Rate limiting on authentication endpoints
- Account lockout after failed attempts
- Secure password requirements

## 💬 Chat System

The chat system provides legal assistance through:

### Knowledge Base
- **Criminal Law**: Theft, assault, fraud, etc.
- **Family Law**: Marriage, divorce, inheritance
- **Property Law**: Land ownership, disputes
- **Business Law**: Contracts, employment

### Features
- Real-time messaging
- Markdown support in responses
- Chat session management
- Message history
- Typing indicators

## 🗄️ Database Schema

### Users Table
```sql
- id (UUID, Primary Key)
- email (VARCHAR, Unique)
- name (VARCHAR)
- password_hash (VARCHAR)
- is_lawyer (BOOLEAN)
- two_factor_enabled (BOOLEAN)
- two_factor_method (VARCHAR)
- two_factor_secret (VARCHAR)
- phone (VARCHAR)
- email_verified (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- last_active (TIMESTAMP)
```

### Chat Sessions Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- title (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Chat Messages Table
```sql
- id (UUID, Primary Key)
- session_id (UUID, Foreign Key)
- user_id (UUID, Foreign Key)
- message (TEXT)
- sender (VARCHAR)
- created_at (TIMESTAMP)
```

### Verification Codes Table
```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key)
- code (VARCHAR)
- type (VARCHAR)
- expires_at (TIMESTAMP)
- used (BOOLEAN)
- created_at (TIMESTAMP)
```

## 🔧 API Endpoints

### Authentication Service (Port 3001)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-2fa` - Two-factor verification
- `GET /health` - Health check

### Chat Service (Port 3003)
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/sessions` - Get user sessions
- `POST /api/chat/messages` - Send message
- `GET /api/chat/sessions/:id/messages` - Get session messages
- `GET /health` - Health check

### API Gateway (Port 3000)
- Routes requests to appropriate services
- Handles authentication middleware
- Implements rate limiting
- Provides centralized logging

## 🤖 AI Model Integration

The application includes a sophisticated AI model service for legal assistance. Here's how to integrate and customize it:

### Current Model Setup

The AI model service (`ai-model/`) includes:
- **Flask API**: RESTful service for model predictions
- **Knowledge Base**: Cameroon-specific legal information
- **Query Classification**: Categorizes questions by legal domain
- **Prometheus Metrics**: Performance monitoring
- **Health Checks**: Kubernetes-ready endpoints

### Integrating Your Trained Model

#### 1. Model Files Structure
```
ai-model/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies  
├── Dockerfile            # Container configuration
├── models/               # Your trained model files
│   ├── legal_model.pkl   # Scikit-learn model
│   ├── tokenizer.json    # Custom tokenizer
│   ├── model.safetensors # Transformer model
│   └── config.json       # Model configuration
└── knowledge_base/       # Legal knowledge files
    ├── cameroon_law.json
    └── case_precedents.json
```

#### 2. Replace the Demo Model

**For Scikit-learn/Traditional ML Models:**
```python
# In ai-model/app.py, update the load_model method:
def load_model(self):
    """Load your trained model"""
    try:
        # Load your trained model
        self.model = joblib.load('/app/models/legal_model.pkl')
        self.vectorizer = joblib.load('/app/models/vectorizer.pkl')

        logger.info("Custom model loaded successfully")
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise

# Update the generate_response method:
def generate_response(self, query):
    try:
        # Vectorize the query
        query_vector = self.vectorizer.transform([query])

        # Get prediction
        prediction = self.model.predict(query_vector)[0]
        confidence = self.model.predict_proba(query_vector).max()

        # Generate response based on prediction
        return self.format_legal_response(prediction, confidence, query)
    except Exception as e:
        logger.error(f"Error generating response: {e}")
        return self.fallback_response()
```

**For Transformer/Deep Learning Models:**
```python
# Update load_model for transformer models:
def load_model(self):
    """Load transformer model"""
    try:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        model_path = '/app/models/'
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_path)

        logger.info("Transformer model loaded successfully")
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise
```

#### 3. Custom Knowledge Base

**Update the knowledge base for your specific legal domain:**
```python
def load_knowledge_base(self):
    """Load your custom legal knowledge base"""
    try:
        with open('/app/knowledge_base/cameroon_law.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback to default knowledge base
        return self.default_knowledge_base()
```

#### 4. Environment Configuration

**Set model-specific environment variables:**
```bash
# In .env or docker-compose.yml
MODEL_PATH=/app/models/your_model
MODEL_TYPE=sklearn  # or "transformer", "custom"
CONFIDENCE_THRESHOLD=0.7
MAX_RESPONSE_LENGTH=500
ENABLE_CACHING=true
```

#### 5. Model Performance Optimization

**Add model-specific optimizations:**
```python
# In app.py, add caching for expensive operations
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_prediction(self, query_hash):
    """Cache predictions for common queries"""
    return self.model.predict(query_hash)

# Add batch processing for multiple queries
@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    """Handle multiple queries at once"""
    data = request.get_json()
    queries = data.get('queries', [])

    responses = []
    for query in queries:
        response = legal_model.generate_response(query)
        responses.append(response)

    return jsonify({"responses": responses})
```

### Deployment Options

#### Option 1: Docker Deployment
```bash
# Build AI model container
cd ai-model
docker build -t lawhelp/ai-model:your-version .

# Run with custom model
docker run -d \
  -p 5000:5000 \
  -v /path/to/your/models:/app/models \
  -e MODEL_PATH=/app/models/your_model \
  lawhelp/ai-model:your-version
```

#### Option 2: Kubernetes Deployment
```yaml
# ai-model-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-model
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: ai-model
        image: lawhelp/ai-model:your-version
        resources:
          requests:
            memory: "2Gi"
            cpu: "1"
          limits:
            memory: "4Gi"
            cpu: "2"
            nvidia.com/gpu: 1  # For GPU acceleration
        volumeMounts:
        - name: model-storage
          mountPath: /app/models
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: model-pvc
```

#### Option 3: GPU Acceleration
```dockerfile
# For GPU-enabled models
FROM nvidia/cuda:11.8-runtime-ubuntu20.04

# Install Python and dependencies
RUN apt-get update && apt-get install -y python3 python3-pip

# Install PyTorch with CUDA support
RUN pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Your model code here
COPY . /app
WORKDIR /app

CMD ["python3", "app.py"]
```

### Testing Your Model Integration

```bash
# Test the AI model endpoint
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the marriage laws in Cameroon?"}'

# Check model health
curl http://localhost:5000/health

# Monitor metrics
curl http://localhost:5000/metrics

# Load test the model
artillery quick --count 100 --num 10 http://localhost:5000/predict
```

### Model Monitoring and Logging

**Add comprehensive monitoring:**
```python
# Custom metrics for your model
MODEL_ACCURACY = Gauge('model_accuracy', 'Model prediction accuracy')
RESPONSE_CONFIDENCE = Histogram('model_confidence', 'Model confidence scores')

def log_prediction(self, query, response, confidence):
    """Log predictions for analysis"""
    logger.info(f"Prediction: {query[:50]}... -> Confidence: {confidence}")
    RESPONSE_CONFIDENCE.observe(confidence)

    # Store for retraining
    self.store_prediction_data(query, response, confidence)
```

### Model Updates and Versioning

```bash
# Blue-green deployment for model updates
kubectl set image deployment/ai-model ai-model=lawhelp/ai-model:v2.0.0

# Rollback if needed
kubectl rollout undo deployment/ai-model

# Canary deployment
kubectl patch deployment ai-model -p '{"spec":{"template":{"metadata":{"labels":{"version":"v2.0.0"}}}}}'
```

### Integration with Frontend

The frontend automatically connects to the AI model through the chat service. Update the API endpoint:

```typescript
// In src/services/chatService.ts
const AI_MODEL_ENDPOINT = process.env.VITE_AI_MODEL_ENDPOINT || 'http://localhost:5000/predict';

async function getAIResponse(message: string): Promise<string> {
  const response = await fetch(AI_MODEL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: message })
  });

  const data = await response.json();
  return data.response;
}
```
## 🚢 Deployment

### Using Docker Compose
```bash
docker-compose up -d
```

To run all the services using Docker Compose, navigate to the root directory of the project in your terminal and execute the command:

```bash
docker-compose up -d
```

This command will start all the services defined in the `docker-compose.yml` file in detached mode (`-d`). Docker Compose will automatically build the necessary images and create containers for each service.

### Kubernetes Orchestration

For large-scale deployments, Kubernetes is recommended:

1.  **Build Docker Images**: Ensure all services have Docker images.
2.  **Create Kubernetes Manifests**: Define deployments, services, and ingress rules.
3.  **Deploy with Helm**: Use Helm charts for simplified management.

Here’s an example `deployment.yaml` for the API Gateway:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: api-gateway
          image: your-docker-repo/api-gateway:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: AUTH_SERVICE_URL
              value: "http://auth-service:3001"
            # ... other service URLs
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  selector:
    app: api-gateway
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
  type: LoadBalancer
```

Apply the Kubernetes manifests:

```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test
```

### Integration tests
```bash
npm run test:integration
```

### E2E tests
```bash
npm run test:e2e
```

### Test Coverage
- Authentication flows
- Chat functionality
- API endpoints
- Frontend components

## 📊 Monitoring

### Health Checks

Each service provides a `/health` endpoint for monitoring:

- Database connectivity
- Service dependencies
- Memory usage
- Response times

### Prometheus and Grafana

Prometheus is used for collecting metrics, and Grafana for visualization.

1.  **Configure Prometheus**: Add scrape configurations for each service.

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'api-gateway'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['api-gateway:3000']
  # ... other services
```

2.  **Import Grafana Dashboards**: Visualize metrics using pre-built dashboards.

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking
- Performance metrics

## 🔒 Security

### Data Protection
- Row Level Security (RLS) in Supabase
- Encrypted passwords with bcrypt
- JWT token authentication
- Input validation and sanitization

### API Security
- Rate limiting
- CORS configuration
- Helmet.js security headers
- Request size limits

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation
- Use conventional commit messages

## 📱 Mobile Support

The application is fully responsive and provides:
- Touch-friendly interfaces
- Mobile-optimized layouts
- Progressive Web App (PWA) capabilities
- Offline functionality

## 🌍 Localization

Currently supports:
- English (default)
- French (planned)

### Adding New Languages
1. Create translation files in `src/i18n/`
2. Update language switcher component
3. Test all UI elements

## 🐛 Troubleshooting

### Common Issues

**Frontend not connecting to backend:**
- Check API_URL in environment variables
- Verify services are running on correct ports
- Check CORS configuration

**Database connection errors:**
- Verify Supabase credentials
- Check network connectivity
- Ensure RLS policies are configured

**Email 2FA not working:**
- Verify SendGrid API key
- Check email templates
- Ensure SMTP configuration

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the troubleshooting section

## 🔮 Roadmap

### Version 2.0
- [ ] Lawyer directory integration
- [ ] Video consultation booking
- [ ] Document templates
- [ ] Payment integration

### Version 3.0
- [ ] AI-powered document review
- [ ] Case management system
- [ ] Advanced analytics
- [ ] Mobile applications

---

Built with ❤️ for the Cameroon legal community#   l a w  
 