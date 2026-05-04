# Golf Strokes Gained Analytics

A full-stack web application for analyzing golf performance using strokes gained methodology. Import your golf rounds from Garmin Connect or upload shot data manually to track your performance against PGA Tour, Scratch, or Bogey benchmarks.

## Features

- 🎯 **Strokes Gained Analysis** - Compare your performance against professional benchmarks
- 📊 **Interactive Dashboard** - Visualize your strengths and weaknesses by category
- ⛳ **Garmin Connect Integration** - Automatically import rounds from your Garmin device
- 📈 **Performance Tracking** - Track improvement over time
- 🏌️ **Shot-by-Shot Analysis** - Detailed breakdown of every shot
- 🎨 **Beautiful UI** - Modern, responsive design optimized for golf analytics

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **Lucide Icons** - Beautiful icons

### Backend
- **FastAPI** - Modern Python web framework
- **Supabase** - PostgreSQL database with authentication
- **Garmin Connect API** - Direct integration via garminconnect library
- **Pydantic** - Data validation

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)
- Garmin Connect account (optional, for automatic imports)

## Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd strokes-gained-app
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Configure your `.env` file** with your Supabase credentials:
   ```env
   # Get these from your Supabase project settings
   NEXT_PUBLIC_SUPABASE_URL=https://tfoytmzdbpdhkrfkiura.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_URL=https://tfoytmzdbpdhkrfkiura.supabase.co
   SUPABASE_KEY=your-service-role-key
   
   # Database connection
   DATABASE_URL=postgresql://postgres:your-password@db.tfoytmzdbpdhkrfkiura.supabase.co:5432/postgres
   
   # Generate a secret key
   SECRET_KEY=$(openssl rand -hex 32)
   
   # API URL (use localhost for development)
   NEXT_PUBLIC_API_URL=http://localhost:8000
   
   # Optional: Garmin Connect credentials (users can also provide via UI)
   GARMIN_EMAIL=
   GARMIN_PASSWORD=
   ```

4. **Build and start the containers**
   ```bash
   docker-compose build --no-cache
   docker-compose up
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## Garmin Connect Integration

### Automatic Import (Recommended)

The app includes built-in Garmin Connect integration for seamless data import:

1. **Navigate to Import Page** in the dashboard
2. **Select "Garmin Connect"** import method
3. **Enter your Garmin credentials**:
   - Email address
   - Password (if you use Google/Apple sign-in, set a password in Garmin account settings first)
4. **Choose number of rounds** to import (1-20)
5. **Select benchmark** (PGA Tour, Scratch, or Bogey)
6. **Click "Fetch from Garmin Connect"**

The app will:
- Authenticate with Garmin Connect
- Fetch your recent golf rounds
- Parse all shot-by-shot data
- Calculate strokes gained for each shot
- Import everything into your dashboard

**Note**: Your Garmin credentials are only used during the import request and are never stored.

### Manual File Upload

If you prefer to upload data manually or Garmin integration is unavailable:

1. Export your round data from Garmin Connect
2. Format it as JSON (see sample format in the import page)
3. Upload via the "Upload File" option

## API Documentation

Once the backend is running, visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

### Key Endpoints

#### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out

#### Shots
- `GET /api/shots/` - List all shots
- `POST /api/shots/` - Create single shot
- `POST /api/shots/bulk` - Bulk import shots
- `GET /api/shots/dashboard` - Dashboard analytics
- `DELETE /api/shots/` - Delete all shots

#### Garmin
- `GET /api/garmin/available` - Check if Garmin integration is available
- `POST /api/garmin/connect` - Test Garmin credentials
- `POST /api/garmin/fetch` - Fetch and import rounds from Garmin

#### Profile
- `GET /api/profile/me` - Get user profile
- `PUT /api/profile/me` - Update profile

## Strokes Gained Methodology

The app uses the strokes gained approach pioneered by Mark Broadie:

- **Driving**: Tee shots on par 4s and par 5s
- **Approach**: Shots from fairway/rough to green (excluding 100 yards from hole on par 4s/5s)
- **Short Game**: Shots within 100 yards of the hole (excluding putts)
- **Putting**: All shots on the green

Each shot is compared against baseline data:
- **PGA Tour**: Professional tour average
- **Scratch**: 0 handicap golfer
- **Bogey**: 18 handicap golfer

## Troubleshooting

### Backend won't start
- Check that all environment variables are set correctly
- Verify Supabase connection string is correct
- Ensure PostgreSQL is accessible
- Run: `docker-compose build --no-cache` to rebuild containers

### Garmin import fails
- Verify your Garmin credentials are correct
- If you use Google/Apple sign-in, set a password in Garmin account settings
- Check that you have golf activities in your Garmin Connect account
- Make sure the garminconnect package is installed

### Docker build fails
- Clear Docker cache: `docker-compose build --no-cache`
- Check that all ports (3000, 8000) are available
- Ensure Docker has enough memory allocated

### Frontend can't connect to backend
- Check that NEXT_PUBLIC_API_URL is set correctly in .env
- Verify backend is running on port 8000
- Check CORS settings in backend

## Next Steps

After setup:

1. **Create an account** at http://localhost:3000
2. **Import your data** from Garmin Connect or upload a JSON file
3. **Explore your dashboard** to see strokes gained analysis
4. **Track your progress** over time

## License

MIT License

## Acknowledgments

- Strokes Gained methodology by Mark Broadie
- Garmin Connect API community
- Baseline data from golf analytics research
