# Narriv - Narrative Intelligence Platform

![Narriv Banner](docs/assets/banner.png)

**Narriv** adalah platform *Narrative Intelligence & Operational Response* yang membantu organisasi memantau sinyal digital, menganalisis narasi, mendeteksi risiko, dan mengkoordinasikan respons proaktif dengan bantuan AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/next.js-16-black)](https://nextjs.org/)

---

## 🎯 Features

### Command Center
- **Real-time Dashboard** - KPI monitoring, sentiment analysis, dan trend visualization
- **Global Activity Map** - Interactive world map dengan signal distribution
- **System Health Monitoring** - Platform, AI Engine, Data Pipeline status

### Data Intelligence
- **Signal Monitoring** - Collect dan analyze signals dari berbagai sumber
- **Source Management** - Apify-powered data ingestion dari social media, news, blogs
- **Sentiment Analysis** - AI-powered sentiment classification

### Risk Management
- **Alert System** - Predictive risk detection dengan escalation matrix
- **Narrative Clustering** - Topic clustering dengan velocity tracking
- **AI Visibility** - Monitor brand presence di AI platforms (ChatGPT, Gemini, etc.)

### Response Automation
- **Action Plans** - AI-generated response strategies
- **Report Generation** - Automated reports dengan customizable templates
- **Team Collaboration** - Workspace-based multi-user support

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Narriv Stack                            │
├─────────────────────────────────────────────────────────────────┤
│  Frontend                    │  Backend                         │
│  ┌─────────────────────────┐ │ ┌─────────────────────────────┐  │
│  │  Next.js 16 (App Router)│ │ │  Express.js 5 API Server   │  │
│  │  React 19               │ │ │  Node.js ESM               │  │
│  │  TypeScript             │ │ │  TypeScript                │  │
│  │  Tailwind CSS v4        │ │ │  Zod Validation            │  │
│  │  Zustand + TanStack     │ │ │  BullMQ Workers            │  │
│  │  next-intl (i18n)       │ │ │  OpenAI Integration        │  │
│  └─────────────────────────┘ │ └─────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Database & Cache              │  External Services            │
│  ┌─────────────────────────┐   │ ┌─────────────────────────┐   │
│  │  Supabase (PostgreSQL)  │   │ │  OpenAI GPT-4          │   │
│  │  Redis (BullMQ + Cache) │   │ │  Apify Scrapers        │   │
│  │  Row-Level Security     │   │ │  Resend (Email)        │   │
│  └─────────────────────────┘   │ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- npm or yarn
- Supabase account
- OpenAI API key
- Apify account (optional)

### 1. Clone Repository

```bash
git clone https://github.com/rectoversomedia/narriv.git
cd narriv
```

### 2. Setup Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env with your credentials:
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - SUPABASE_ANON_KEY
# - JWT_SECRET
# - OPENAI_API_KEY

# Install dependencies
npm install

# Start development server
npm run dev
```

### 3. Setup Frontend

```bash
cd frontend

# Copy environment file
cp .env.example .env.local

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Access Application

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- Backend Health: http://localhost:3000/health

---

## 📁 Project Structure

```
narriv/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── modules/           # Feature modules (auth, signals, alerts, etc.)
│   │   ├── lib/              # Shared utilities (Supabase, cache, queue)
│   │   ├── workers/          # BullMQ background workers
│   │   ├── middlewares/      # Express middleware
│   │   └── index.js          # Application entry point
│   ├── tests/                # Integration tests
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # Next.js 16 dashboard
│   ├── app/                  # App Router pages
│   ├── components/           # React components
│   ├── lib/                  # API client, utilities
│   ├── store/               # Zustand stores
│   ├── messages/            # i18n translations (EN/ID)
│   ├── public/              # Static assets
│   ├── Dockerfile
│   └── package.json
│
├── docs/                      # Documentation
│   ├── getting-started.md    # Setup guide
│   ├── api.md               # API reference
│   ├── deployment.md        # Deployment guide
│   └── supabase-setup.md    # Database setup
│
├── nginx/                     # Nginx configuration
├── docker-compose.production.yml  # Production Docker setup
└── README.md
```

---

## 🔧 Environment Variables

### Backend (.env)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AI
OPENAI_API_KEY=sk-your-openai-key

# External Services
APIFY_TOKEN=your-apify-token
RESEND_API_KEY=re_your-resend-key

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 🐳 Docker Deployment

### Development

```bash
cd narriv
docker-compose -f docker-compose.dev.yml up -d
```

### Production

```bash
cd narriv
docker-compose -f docker-compose.production.yml up -d
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

### Frontend E2E Tests

```bash
cd frontend
npm run e2e
```

### Load Tests

```bash
cd backend
npm run load:smoke   # Quick smoke test
npm run load:baseline # Baseline performance
npm run load:stress   # Stress test
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/getting-started.md) | Detailed setup instructions |
| [API Reference](docs/api.md) | Complete API documentation |
| [Deployment Guide](docs/deployment.md) | Production deployment guide |
| [Supabase Setup](docs/supabase-setup.md) | Database schema and RLS policies |

---

## 🔒 Security

- JWT authentication with refresh tokens
- Supabase Row-Level Security (RLS)
- Rate limiting on sensitive endpoints
- Input sanitization and validation
- Security headers (HSTS, CSP, X-Frame-Options)
- HTTPS enforcement in production

See [SECURITY.md](docs/security/SECURITY.md) for vulnerability reporting.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - PostgreSQL database
- [OpenAI](https://openai.com/) - AI capabilities
- [Apify](https://apify.com/) - Web scraping
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

<p align="center">
  <strong>Built with ❤️ by NarrativeVerse Media</strong>
</p>
