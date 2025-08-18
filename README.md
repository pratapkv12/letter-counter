# ColdStorm.AI MVP

An AI-powered cold email automation platform that personalizes outreach at scale.

## 🚀 Project Structure

```
ColdStormAI/
├── README.md
├── .env.example
├── backend/                 # Node.js + Express API
├── ai_engine/              # Python FastAPI microservice
├── frontend/               # React + Tailwind + shadcn
├── whatsapp_bot/           # WhatsApp integration
├── excel_export/           # Excel reporting utilities
└── data/                   # Sample data files
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.9+
- npm or yarn

### 1. Environment Setup
```bash
cp .env.example .env
# Fill in your API keys and configuration
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 3. AI Engine Setup
```bash
cd ai_engine
pip install -r requirements.txt
uvicorn email_generator:app --reload --port 8001
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 📡 API Endpoints

### Backend (Port 3000)
- `POST /api/email/send-batch` - Send personalized email batch
- `POST /api/webhooks/email-events` - Handle email provider webhooks

### AI Engine (Port 8001)
- `POST /generate` - Generate personalized email content
- `POST /score` - Score lead quality
- `POST /analyze` - Analyze email replies

## 🔧 Environment Variables

See `.env.example` for all required configuration variables.

## 🚀 Deployment

- **Frontend**: Firebase Hosting ready
- **Backend**: Deploy to Railway, Heroku, or Firebase Functions
- **AI Engine**: Deploy to Railway, Google Cloud Run, or similar

## 📊 Features

- ✅ Lead CSV upload and management
- ✅ AI-powered email personalization
- ✅ Email tracking and analytics
- ✅ Reply sentiment analysis
- ✅ WhatsApp summary notifications
- ✅ Excel report generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details