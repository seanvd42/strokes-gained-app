# Strokes Gained Application - Setup Guide

This guide will walk you through setting up the complete Strokes Gained application from scratch.

## Prerequisites

Before starting, ensure you have:
- Docker Desktop installed and running
- A Supabase account (free tier at https://supabase.com)
- Git (for version control)
- Text editor (VS Code recommended)

## Step 1: Supabase Setup

### 1.1 Create a New Project
1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - Name: `strokes-gained`
   - Database Password: (generate a strong password - save it!)
   - Region: Choose closest to you
5. Click "Create new project" (this takes ~2 minutes)

### 1.2 Get Your Credentials
Once the project is ready:

1. Go to **Project Settings > API**
2. Copy these values:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key (keep this secure!)

3. Go to **Project Settings > Database**
4. Scroll to "Connection string" > "URI"
5. Copy the connection string (it starts with `postgresql://`)
6. Replace `[YOUR-PASSWORD]` with your database password

### 1.3 Initialize the Database
1. Go to **SQL Editor** in your Supabase dashboard
2. Open the file `/backend/database/schema.sql` from this project
3. Copy the entire contents
4. Paste into the SQL Editor
5. Click "Run" to execute
6. You should see "Success. No rows returned"

## Step 2: Project Setup

### 2.1 Create Environment File
In the project root, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 2.2 Configure Environment Variables
Edit the `.env` file with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...your-service-role-key

# Database (from Supabase connection string)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Backend Secret Key (generate with: openssl rand -hex 32)
SECRET_KEY=your-generated-secret-key-here

# API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

To generate a secret key on Mac/Linux:
```bash
openssl rand -hex 32
```

On Windows (PowerShell):
```powershell
[System.Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Step 3: Launch the Application

### 3.1 Start with Docker (Recommended)
From the project root:

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

This will:
- Build the frontend (Next.js) container
- Build the backend (FastAPI) container  
- Start both services with hot-reload enabled

### 3.2 Verify Services
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### 3.3 Stop Services
```bash
# Stop containers
docker-compose down

# Stop and remove volumes (clears data)
docker-compose down -v
```

## Step 4: Alternative - Local Development (Without Docker)

### 4.1 Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

### 4.2 Frontend Setup
In a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## Step 5: Create Your First Account

1. Navigate to http://localhost:3000
2. Click "Get Started" or "Sign Up"
3. Fill in your details:
   - Name
   - Email
   - Password (min 6 characters)
4. Click "Create Account"
5. You'll be redirected to the dashboard

## Step 6: Import Sample Data

### 6.1 Create Sample Data File
Create a file named `sample-shots.json`:

```json
[
  {
    "shot_date": "2024-01-15",
    "hole_number": 1,
    "shot_number": 1,
    "club": "Driver",
    "distance": 280,
    "start_position": "tee_box",
    "end_position": "fairway",
    "start_distance_to_hole": 400,
    "end_distance_to_hole": 120
  },
  {
    "shot_date": "2024-01-15",
    "hole_number": 1,
    "shot_number": 2,
    "club": "9 Iron",
    "distance": 120,
    "start_position": "fairway",
    "end_position": "green",
    "start_distance_to_hole": 120,
    "end_distance_to_hole": 15
  },
  {
    "shot_date": "2024-01-15",
    "hole_number": 1,
    "shot_number": 3,
    "club": "Putter",
    "distance": 15,
    "start_position": "green",
    "end_position": "green",
    "start_distance_to_hole": 15,
    "end_distance_to_hole": 0
  }
]
```

### 6.2 Upload Data
1. In the dashboard, click "Import Data"
2. Select benchmark (PGA Tour, Scratch, or Bogey)
3. Click "Choose File" and select your `sample-shots.json`
4. Data will be processed and you'll be redirected to the dashboard

## Step 7: Using the Application

### 7.1 Dashboard Features
- **Summary Metrics**: View total shots, strokes gained, best/worst shots
- **Filters**: Filter by date range and benchmark
- **Shot Table**: Detailed view of every shot with calculated SG values

### 7.2 Profile Settings
- Click "Profile" in navigation
- Update your name
- Change data source preference
- View account information

## Troubleshooting

### Backend won't start
- Check that your `.env` file has all required variables
- Verify Supabase credentials are correct
- Check logs: `docker-compose logs backend`

### Frontend won't connect to backend
- Ensure backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `.env`
- Verify CORS settings in backend

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check Supabase project is active
- Ensure database schema was created (Step 1.3)

### Authentication errors
- Clear browser cookies/storage
- Verify Supabase Auth is enabled
- Check `SUPABASE_KEY` and `SUPABASE_URL` match

### Container issues
```bash
# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up
```

## Development Tips

### Hot Reload
Both frontend and backend support hot reload:
- Frontend: Changes to `.tsx`/`.ts` files auto-reload
- Backend: Changes to `.py` files auto-reload

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

### Access Database
Use Supabase dashboard Table Editor or SQL Editor to view/modify data directly.

### API Testing
Visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

## Next Steps

### Add More Features
- Implement chart visualizations
- Add shot dispersion patterns  
- Create practice recommendations
- Build comparison tools

### Deploy to Production
See `DEPLOYMENT.md` for cloud deployment instructions.

### Backup Data
Regular backups via Supabase dashboard > Database > Backups

## Getting Help

- Check backend logs: `docker-compose logs backend`
- Check frontend logs: `docker-compose logs frontend`
- Review Supabase logs in dashboard
- Verify all environment variables are set

## Security Notes

⚠️ **Important Security Reminders:**
- Never commit `.env` file to version control
- Keep `service_role` key secure (server-side only)
- Use strong passwords for all accounts
- Regularly update dependencies
- Enable 2FA on Supabase account

## Success Checklist

- ✅ Supabase project created
- ✅ Database schema initialized
- ✅ Environment variables configured
- ✅ Docker containers running
- ✅ Can access frontend at localhost:3000
- ✅ Can access backend at localhost:8000
- ✅ Successfully created user account
- ✅ Successfully imported sample data
- ✅ Dashboard displays shot data and metrics

You're all set! Start analyzing your golf game with data-driven insights.
