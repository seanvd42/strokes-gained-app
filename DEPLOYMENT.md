# Deployment Guide - Strokes Gained Application

This guide covers deploying the Strokes Gained application to production environments.

## Overview

The application consists of:
- **Frontend**: Next.js application (static + API routes)
- **Backend**: FastAPI Python application
- **Database**: Supabase (managed PostgreSQL)

## Deployment Options

### Option 1: Google Cloud Run (Recommended)
- Fully managed serverless containers
- Auto-scaling
- Pay-per-use pricing
- Easy CI/CD integration

### Option 2: Vercel (Frontend) + Google Cloud Run (Backend)
- Vercel for Next.js (optimal performance)
- Cloud Run for FastAPI backend
- Separate scaling for each tier

### Option 3: AWS ECS/Fargate
- AWS container orchestration
- Integration with AWS services
- Similar to Cloud Run

### Option 4: DigitalOcean App Platform
- Simpler setup
- Lower cost for small apps
- Good for MVPs

---

## Google Cloud Run Deployment

### Prerequisites
- Google Cloud account
- `gcloud` CLI installed
- Docker installed locally
- Project built and tested locally

### 1. Setup Google Cloud

```bash
# Install gcloud CLI (if not already installed)
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Create a new project
gcloud projects create strokes-gained-prod --name="Strokes Gained"

# Set the project
gcloud config set project strokes-gained-prod

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2. Deploy Backend (FastAPI)

#### 2.1 Create Production Dockerfile
Create `backend/Dockerfile.prod`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8080

# Run with gunicorn for production
CMD exec gunicorn --bind :8080 --workers 2 --worker-class uvicorn.workers.UvicornWorker --timeout 0 app.main:app
```

Add gunicorn to `backend/requirements.txt`:
```
gunicorn==21.2.0
```

#### 2.2 Build and Deploy

```bash
cd backend

# Build and submit to Cloud Build
gcloud builds submit --tag gcr.io/strokes-gained-prod/backend

# Deploy to Cloud Run
gcloud run deploy strokes-gained-api \
  --image gcr.io/strokes-gained-prod/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=$SUPABASE_URL,SUPABASE_KEY=$SUPABASE_KEY,DATABASE_URL=$DATABASE_URL,SECRET_KEY=$SECRET_KEY"

# Get the backend URL
gcloud run services describe strokes-gained-api --region us-central1 --format 'value(status.url)'
```

**Important**: Use Secret Manager for production:

```bash
# Create secrets
echo -n "your-supabase-key" | gcloud secrets create supabase-key --data-file=-
echo -n "your-secret-key" | gcloud secrets create app-secret-key --data-file=-

# Deploy with secrets
gcloud run deploy strokes-gained-api \
  --image gcr.io/strokes-gained-prod/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets "SUPABASE_KEY=supabase-key:latest,SECRET_KEY=app-secret-key:latest" \
  --set-env-vars "SUPABASE_URL=$SUPABASE_URL,DATABASE_URL=$DATABASE_URL"
```

### 3. Deploy Frontend (Next.js)

#### 3.1 Update Environment Variables
Create `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://strokes-gained-api-xxxxx-uc.a.run.app
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 3.2 Create Production Dockerfile
Create `frontend/Dockerfile.prod`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
```

#### 3.3 Build and Deploy

```bash
cd frontend

# Build and submit
gcloud builds submit --tag gcr.io/strokes-gained-prod/frontend

# Deploy
gcloud run deploy strokes-gained-web \
  --image gcr.io/strokes-gained-prod/frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://your-backend-url.run.app,NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
```

### 4. Configure Custom Domain (Optional)

```bash
# Map domain to frontend
gcloud run domain-mappings create \
  --service strokes-gained-web \
  --domain app.yourdomain.com \
  --region us-central1

# Map domain to backend
gcloud run domain-mappings create \
  --service strokes-gained-api \
  --domain api.yourdomain.com \
  --region us-central1
```

Update DNS records as instructed by gcloud output.

---

## Vercel Deployment (Frontend Only)

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy Frontend

```bash
cd frontend

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables in Vercel dashboard
# Or via CLI:
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

### 3. Configure Backend URL
Update `NEXT_PUBLIC_API_URL` to point to your Cloud Run backend.

---

## Environment Variables for Production

### Backend (.env)
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
SECRET_KEY=production-secret-key-64-chars
ALLOWED_ORIGINS=["https://app.yourdomain.com","https://www.yourdomain.com"]
```

### Frontend (.env.production)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
      
      - name: Build and Deploy Backend
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT }}/backend ./backend
          gcloud run deploy strokes-gained-api \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/backend \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v3
      
      - id: auth
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Build and Deploy Frontend
        run: |
          gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT }}/frontend ./frontend
          gcloud run deploy strokes-gained-web \
            --image gcr.io/${{ secrets.GCP_PROJECT }}/frontend \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated
```

Add these secrets to GitHub:
- `GCP_SA_KEY`: Service account JSON key
- `GCP_PROJECT`: Your GCP project ID

---

## Database Migrations

For production, use proper migrations:

### Using Alembic (Recommended)

```bash
cd backend
pip install alembic

# Initialize
alembic init migrations

# Create migration
alembic revision --autogenerate -m "Initial schema"

# Apply migrations
alembic upgrade head
```

---

## Monitoring and Logging

### Cloud Run Logs
```bash
# View backend logs
gcloud run logs read strokes-gained-api --region us-central1

# Stream logs
gcloud run logs tail strokes-gained-api --region us-central1
```

### Supabase Monitoring
- Dashboard > Logs
- Dashboard > Database > Query Performance

### Setup Alerts
```bash
# Create uptime check
gcloud monitoring uptime create \
  --display-name="Strokes Gained API" \
  --http-check-path=/health \
  --http-check-url=https://your-backend-url.run.app
```

---

## Performance Optimization

### Frontend Optimization
1. Enable Next.js image optimization
2. Configure CDN caching
3. Enable compression
4. Minimize bundle size

### Backend Optimization
1. Use connection pooling for database
2. Implement Redis caching
3. Enable gzip compression
4. Optimize database queries

### Database Optimization
1. Add appropriate indexes
2. Use prepared statements
3. Enable connection pooling
4. Regular VACUUM operations

---

## Security Checklist

- ✅ Use HTTPS everywhere
- ✅ Enable CORS only for production domains
- ✅ Use environment variables for secrets
- ✅ Enable Supabase RLS policies
- ✅ Regular security updates
- ✅ Enable Cloud Run authentication if needed
- ✅ Use Secret Manager for sensitive data
- ✅ Configure CSP headers
- ✅ Rate limiting on API endpoints
- ✅ Regular backups

---

## Backup Strategy

### Supabase Backups
- Automatic daily backups (Pro plan)
- Manual backups before major changes
- Export to external storage periodically

### Manual Backup
```bash
# Export database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Upload to Cloud Storage
gsutil cp backup_*.sql gs://your-backup-bucket/
```

---

## Scaling Considerations

### Auto-scaling (Cloud Run)
```bash
# Configure scaling
gcloud run services update strokes-gained-api \
  --min-instances=1 \
  --max-instances=10 \
  --concurrency=80
```

### Database Scaling
- Upgrade Supabase plan as needed
- Optimize queries and indexes
- Consider read replicas for high traffic

---

## Cost Estimation

### Google Cloud Run (Monthly)
- Backend: ~$5-20 (low traffic)
- Frontend: ~$5-15 (low traffic)
- Container Registry: ~$0-5

### Supabase
- Free tier: $0 (500MB database, 50K monthly active users)
- Pro: $25/month (8GB database, 100K MAU)

### Total Estimated Cost
- MVP/Low Traffic: ~$10-40/month
- Growing App: ~$50-100/month
- Scale: Pay as you grow

---

## Rollback Procedure

```bash
# List revisions
gcloud run revisions list --service strokes-gained-api

# Rollback to previous revision
gcloud run services update-traffic strokes-gained-api \
  --to-revisions REVISION-NAME=100
```

---

## Health Checks

Both services should have health check endpoints:

### Backend
Already implemented at `/health`

### Frontend
Add to `frontend/src/app/api/health/route.ts`:

```typescript
export async function GET() {
  return Response.json({ status: 'healthy' })
}
```

---

## Support and Maintenance

### Regular Tasks
- Weekly: Review logs and errors
- Monthly: Update dependencies
- Quarterly: Security audit
- Yearly: Infrastructure review

### Monitoring Dashboards
- Cloud Run metrics
- Supabase analytics
- Error tracking (Sentry recommended)

---

## Success Checklist

- ✅ Backend deployed and accessible
- ✅ Frontend deployed and accessible
- ✅ Environment variables configured
- ✅ Database connected
- ✅ Authentication working
- ✅ HTTPS enabled
- ✅ Custom domain configured (if applicable)
- ✅ Monitoring and alerts set up
- ✅ Backup strategy in place
- ✅ CI/CD pipeline configured

Your application is now live in production! 🎉
