# Strokes Gained Web Application

A modern, cloud-ready platform for ingesting, processing, and visualizing golf shot data with strokes gained analytics.

## Architecture

- **Frontend**: Next.js 14 (React) + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database & Auth**: Supabase (PostgreSQL)
- **Infrastructure**: Docker Compose

## Prerequisites

- Docker Desktop
- Node.js 18+ (for local development without Docker)
- Python 3.11+ (for local development without Docker)
- Supabase account (free tier available at https://supabase.com)

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd strokes-gained-app
cp .env.example .env
```

### 2. Configure Supabase

1. Create a new project at https://supabase.com
2. Go to Project Settings > API
3. Copy your project URL and keys to `.env`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_KEY` (service role key)
4. Go to Project Settings > Database
5. Copy the connection string to `.env` as `DATABASE_URL`

### 3. Initialize Database Schema

Run the SQL commands from `backend/database/schema.sql` in your Supabase SQL Editor.

### 4. Launch Application

```bash
# Start all services with Docker
docker-compose up --build

# Frontend will be available at http://localhost:3000
# Backend API at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 5. Development Without Docker

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Features

### MVP (Current)
- ✅ Static landing page with marketing content
- ✅ User authentication (email/password via Supabase)
- ✅ Profile management (name, email, data source)
- ✅ Interactive dashboard with:
  - Shot details table
  - Summary metrics
  - Date range filtering
  - Benchmark filtering

### Future Scope
- Cloud deployment (Google Cloud Run)
- Progressive Web App (PWA)
- SSO integration (Google OAuth)
- Additional data sources
- Advanced visualizations (dispersion patterns, heat maps)
- Mobile app (React Native)

## Project Structure

```
strokes-gained-app/
├── frontend/               # Next.js application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities and Supabase client
│   └── public/            # Static assets
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Core logic (strokes gained)
│   │   ├── models/       # Data models
│   │   └── services/     # Business logic
│   └── database/         # SQL schemas
└── docker-compose.yml    # Container orchestration
```

## Security

- **Row Level Security (RLS)**: Implemented at database level
- **Authentication**: Supabase Auth with JWT tokens
- **Secret Management**: Environment variables (never committed)
- **CORS**: Configured for frontend domain only

## API Documentation

Once running, visit http://localhost:8000/docs for interactive API documentation.

## Testing

**Backend:**
```bash
cd backend
pytest
```

**Frontend:**
```bash
cd frontend
npm test
```

## Deployment

### Docker Production Build

```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Cloud Run (GCP)

```bash
# Backend
gcloud run deploy strokes-gained-api --source ./backend

# Frontend
gcloud run deploy strokes-gained-web --source ./frontend
```

## License

Proprietary - All Rights Reserved

## Support

For issues and questions, please contact support@strokesgained.app
