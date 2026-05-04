# Quick Start Guide

This guide will get your Golf Strokes Gained app up and running in under 10 minutes.

## Prerequisites Check

Make sure you have:
- ✅ Docker and Docker Compose installed
- ✅ A Supabase account (free tier works)
- ✅ A Garmin Connect account with golf data (optional)

## Step 1: Configure Environment

1. **Copy the example environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Get your Supabase credentials** from https://supabase.com:
   - Create a new project (or use existing)
   - Go to Project Settings > API
   - Copy these values to your `.env`:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://tfoytmzdbpdhkrfkiura.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
     SUPABASE_URL=https://tfoytmzdbpdhkrfkiura.supabase.co
     SUPABASE_KEY=your-service-role-key-here
     ```

3. **Get your database password**:
   - Go to Project Settings > Database
   - Find "Connection string" section
   - Copy the password and update:
     ```env
     DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.tfoytmzdbpdhkrfkiura.supabase.co:5432/postgres
     ```

4. **Generate a secret key**:
   ```bash
   openssl rand -hex 32
   ```
   Add it to `.env`:
   ```env
   SECRET_KEY=your-generated-secret-key
   ```

5. **Set API URL** (keep this for local development):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

## Step 2: Set Up Database

1. **Go to your Supabase project** at https://supabase.com
2. **Open the SQL Editor** (left sidebar)
3. **Run this SQL** to create the database schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create shots table
CREATE TABLE shots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shot_date DATE NOT NULL,
    hole_number INTEGER NOT NULL CHECK (hole_number BETWEEN 1 AND 18),
    shot_number INTEGER NOT NULL,
    club VARCHAR(50),
    distance_yards DECIMAL(10, 2),
    lie_type VARCHAR(20),
    starting_position VARCHAR(20),
    ending_position VARCHAR(20),
    strokes_gained DECIMAL(10, 4),
    benchmark VARCHAR(20) DEFAULT 'pga_tour',
    raw_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_shots_user_id ON shots(user_id);
CREATE INDEX idx_shots_date ON shots(shot_date);
CREATE INDEX idx_shots_hole ON shots(hole_number);
CREATE INDEX idx_shots_lie ON shots(lie_type);

-- Enable Row Level Security
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own shots"
    ON shots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shots"
    ON shots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shots"
    ON shots FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shots"
    ON shots FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_shots_updated_at
    BEFORE UPDATE ON shots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

4. **Click "Run"** to execute the SQL

## Step 3: Build and Start

1. **Build the Docker containers** (first time only):
   ```bash
   docker-compose build --no-cache
   ```
   This will take 3-5 minutes.

2. **Start the application**:
   ```bash
   docker-compose up
   ```
   
   You should see:
   ```
   frontend_1  | ✓ Ready on http://localhost:3000
   backend_1   | INFO: Uvicorn running on http://0.0.0.0:8000
   ```

## Step 4: Create Account and Import Data

1. **Open your browser** to http://localhost:3000

2. **Sign up for an account**:
   - Click "Sign Up"
   - Enter email and password
   - Confirm your email (check Supabase email settings if needed)

3. **Import your golf data**:
   
   **Option A: Garmin Connect (Automatic)**
   - Navigate to Dashboard > Import
   - Select "Garmin Connect"
   - Enter your Garmin credentials
   - Choose number of rounds (start with 1-2)
   - Select benchmark (PGA Tour recommended)
   - Click "Fetch from Garmin Connect"
   
   **Option B: File Upload (Manual)**
   - Navigate to Dashboard > Import
   - Select "Upload File"
   - Download the sample JSON template
   - Format your data
   - Upload the file

4. **View your dashboard**:
   - After import, you'll be redirected to the dashboard
   - See your strokes gained by category
   - Analyze your performance

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Common fixes:
# 1. Verify .env file has all credentials
# 2. Check Supabase connection string
# 3. Rebuild containers:
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Frontend can't connect to backend
```bash
# Verify NEXT_PUBLIC_API_URL in .env:
NEXT_PUBLIC_API_URL=http://localhost:8000

# Rebuild frontend:
docker-compose down
docker-compose build --no-cache frontend
docker-compose up
```

### Garmin import fails
1. **Check credentials**: Make sure you can log in at https://connect.garmin.com
2. **Password users**: If you use Google/Apple sign-in, you need to set a password in Garmin settings first
3. **Check data**: Make sure you have golf activities with shot data (requires CT10 sensors or compatible device)

### Database connection fails
1. **Verify password**: Check DATABASE_URL has correct password
2. **Check Supabase**: Make sure project is not paused
3. **Test connection**: Use the connection string in a PostgreSQL client

## Next Steps

Once everything is running:

1. **Import multiple rounds** to see trends
2. **Explore the dashboard** to identify weaknesses
3. **Compare benchmarks** (PGA Tour vs Scratch vs Bogey)
4. **Track improvement** over time
5. **Analyze by club** to optimize bag setup

## Useful Commands

```bash
# Start the app
docker-compose up

# Start in background
docker-compose up -d

# Stop the app
docker-compose down

# Rebuild after code changes
docker-compose build --no-cache

# View logs
docker-compose logs -f

# View backend logs only
docker-compose logs -f backend

# View frontend logs only
docker-compose logs -f frontend

# Restart a service
docker-compose restart backend

# Access backend shell
docker-compose exec backend bash

# Access frontend shell
docker-compose exec frontend sh
```

## Getting Help

1. Check the main [README.md](README.md) for detailed documentation
2. Review [GARMIN_INTEGRATION.md](GARMIN_INTEGRATION.md) for Garmin-specific help
3. Check API docs at http://localhost:8000/docs
4. Review Docker logs for error messages

## Success!

If you see your dashboard with imported golf data, congratulations! You're all set up. Start analyzing your game and tracking improvement! 🏌️⛳
