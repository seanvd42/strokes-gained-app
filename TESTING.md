# Testing Guide - Strokes Gained Application

This guide covers testing strategies and procedures for the Strokes Gained application.

## Quick Start Testing

### 1. Generate Sample Data

From the backend directory:

```bash
cd backend
python generate_sample_data.py
```

This creates `sample_golf_data.json` with 3 rounds of realistic golf data.

### 2. Test the Application

1. Start the application:
   ```bash
   docker-compose up
   ```

2. Navigate to http://localhost:3000

3. Create a test account:
   - Email: test@example.com
   - Password: testpass123
   - Name: Test User

4. Import the sample data:
   - Go to Dashboard > Import Data
   - Upload `sample_golf_data.json`
   - Select benchmark (PGA Tour recommended)
   - Click upload

5. Verify dashboard displays:
   - Summary metrics (total shots, avg SG, etc.)
   - Shot details table
   - Correct calculations

## Manual Testing Checklist

### Authentication Flow
- [ ] Sign up with new account
- [ ] Sign up with existing email (should fail)
- [ ] Sign in with correct credentials
- [ ] Sign in with wrong password (should fail)
- [ ] Sign out successfully
- [ ] Protected routes redirect to login when not authenticated

### Profile Management
- [ ] View profile information
- [ ] Update name successfully
- [ ] Change data source preference
- [ ] Changes persist after logout/login

### Data Import
- [ ] Upload valid JSON file
- [ ] Upload invalid JSON (should show error)
- [ ] Upload file with missing fields (should handle gracefully)
- [ ] Different benchmarks calculate different SG values
- [ ] Large file import (100+ shots) works
- [ ] Import success redirects to dashboard

### Dashboard Functionality
- [ ] Summary metrics calculate correctly
- [ ] Shot table displays all shots
- [ ] Date filter works (start date only)
- [ ] Date filter works (end date only)
- [ ] Date filter works (date range)
- [ ] Benchmark filter updates calculations
- [ ] Empty state shows when no data
- [ ] Pagination works (if implemented)

### Data Accuracy
- [ ] Positive SG shows in green
- [ ] Negative SG shows in red
- [ ] Total SG equals sum of individual shots
- [ ] Average SG is correct
- [ ] Best/worst shot values are accurate
- [ ] Success rate percentage is correct

## API Testing

### Using the Interactive Docs

1. Navigate to http://localhost:8000/docs
2. Test each endpoint:

#### Auth Endpoints
```bash
# Sign Up
POST /api/auth/signup
{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User"
}

# Sign In
POST /api/auth/signin
{
  "email": "test@example.com",
  "password": "password123"
}
```

#### Profile Endpoints
```bash
# Get Profile (requires auth token)
GET /api/profile/me
Headers: Authorization: Bearer {token}

# Update Profile
PUT /api/profile/me
Headers: Authorization: Bearer {token}
{
  "name": "Updated Name",
  "data_source": "garmin"
}
```

#### Shots Endpoints
```bash
# Get Dashboard Data
GET /api/shots/dashboard?benchmark=pga_tour
Headers: Authorization: Bearer {token}

# Create Single Shot
POST /api/shots/
Headers: Authorization: Bearer {token}
{
  "shot_date": "2024-01-15",
  "club": "Driver",
  "distance_yards": 280,
  "benchmark": "pga_tour",
  "raw_data": {
    "start_distance_to_hole": 400,
    "end_distance_to_hole": 120,
    "start_position": "tee_box",
    "end_position": "fairway"
  }
}

# Bulk Import
POST /api/shots/bulk
Headers: Authorization: Bearer {token}
{
  "shots": [...],
  "benchmark": "pga_tour"
}
```

### Using cURL

```bash
# Get auth token first
TOKEN=$(curl -X POST http://localhost:8000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.access_token')

# Test authenticated endpoint
curl http://localhost:8000/api/profile/me \
  -H "Authorization: Bearer $TOKEN"

# Get dashboard data
curl "http://localhost:8000/api/shots/dashboard?benchmark=pga_tour" \
  -H "Authorization: Bearer $TOKEN"
```

## Unit Testing

### Backend Tests

Create `backend/tests/test_strokes_gained.py`:

```python
import pytest
from app.core.strokes_gained import StrokesGainedCalculator

def test_calculator_initialization():
    calc = StrokesGainedCalculator("pga_tour")
    assert calc.benchmark_name == "pga_tour"

def test_expected_strokes():
    calc = StrokesGainedCalculator("pga_tour")
    
    # Test tee box
    strokes = calc.get_expected_strokes(250, "tee_box")
    assert 3.0 <= strokes <= 3.5
    
    # Test green
    strokes = calc.get_expected_strokes(10, "green")
    assert 1.5 <= strokes <= 2.0

def test_strokes_gained_calculation():
    calc = StrokesGainedCalculator("pga_tour")
    
    # Good drive
    sg = calc.calculate_strokes_gained(
        start_distance=400,
        start_lie="tee_box",
        end_distance=150,
        end_lie="fairway",
        strokes_taken=1
    )
    assert sg > 0  # Should be positive for good shot
    
    # Poor shot
    sg = calc.calculate_strokes_gained(
        start_distance=150,
        start_lie="fairway",
        end_distance=140,
        end_lie="rough",
        strokes_taken=1
    )
    assert sg < 0  # Should be negative for bad shot
```

Run tests:
```bash
cd backend
pytest tests/ -v
```

### Frontend Tests

Create `frontend/src/lib/__tests__/api.test.ts`:

```typescript
import { api } from '../api'

describe('API Client', () => {
  it('should have all required methods', () => {
    expect(api.auth.signup).toBeDefined()
    expect(api.auth.signin).toBeDefined()
    expect(api.profile.get).toBeDefined()
    expect(api.shots.getAll).toBeDefined()
  })
})
```

Run tests:
```bash
cd frontend
npm test
```

## Integration Testing

### End-to-End User Flow

1. **New User Registration**
   - Sign up → Dashboard (empty state)
   - Import data → Data appears
   - Sign out → Sign back in → Data persists

2. **Data Management Flow**
   - Import sample data
   - Verify calculations
   - Apply filters
   - Change benchmark
   - Verify recalculations

3. **Profile Updates**
   - Update name
   - Change data source
   - Verify updates persist

## Performance Testing

### Load Testing Backend

Using Apache Bench:

```bash
# Test auth endpoint
ab -n 100 -c 10 -p signup.json -T application/json \
  http://localhost:8000/api/auth/signup

# Test dashboard (requires auth)
ab -n 100 -c 10 -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/shots/dashboard
```

### Expected Performance
- Auth endpoints: < 200ms response time
- Dashboard load: < 500ms response time
- Bulk import (100 shots): < 2s processing time

## Security Testing

### Authentication Security
- [ ] JWT tokens expire correctly
- [ ] Invalid tokens are rejected
- [ ] User can only access own data
- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are sanitized

### Test RLS (Row Level Security)

```sql
-- In Supabase SQL Editor, test RLS policies

-- Try to access another user's data (should fail)
SELECT * FROM shots WHERE user_id != auth.uid();

-- Try to insert with wrong user_id (should fail)
INSERT INTO shots (user_id, shot_date, club)
VALUES ('wrong-user-id', '2024-01-01', 'Driver');
```

## Database Testing

### Test Data Integrity

```sql
-- Check for orphaned records
SELECT COUNT(*) FROM shots 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Verify indexes exist
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename IN ('shots', 'profiles');

-- Check constraint violations
SELECT * FROM shots WHERE shot_date > CURRENT_DATE;
```

## Error Handling Testing

### Frontend Error States
- [ ] Network error (backend down)
- [ ] 401 Unauthorized (expired token)
- [ ] 500 Server Error
- [ ] Invalid form input
- [ ] File upload failures

### Backend Error States
- [ ] Invalid request body
- [ ] Missing required fields
- [ ] Database connection failure
- [ ] Invalid benchmark value
- [ ] Malformed JSON

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Responsive Design Testing

Test layouts at:
- [ ] Mobile (320px - 480px)
- [ ] Tablet (481px - 768px)
- [ ] Desktop (769px - 1024px)
- [ ] Large Desktop (1025px+)

## Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Form labels are proper
- [ ] Error messages are clear

## Test Data Cleanup

After testing:

```bash
# Delete test user and all data via Supabase dashboard
# Or via SQL:
DELETE FROM profiles WHERE email = 'test@example.com';
# (shots will cascade delete due to foreign key)
```

## Automated Testing Setup

### GitHub Actions CI

Create `.github/workflows/test.yml`:

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest
      - name: Run tests
        run: |
          cd backend
          pytest

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      - name: Run tests
        run: |
          cd frontend
          npm test
```

## Bug Reporting Template

When filing bugs, include:

1. **Environment**
   - Browser/OS
   - Application version
   - Docker or local?

2. **Steps to Reproduce**
   - Exact steps taken
   - Sample data used

3. **Expected Behavior**
   - What should happen

4. **Actual Behavior**
   - What actually happened
   - Screenshots if applicable

5. **Logs**
   - Browser console errors
   - Backend logs
   - Network tab data

## Testing Checklist Summary

- [ ] All manual tests pass
- [ ] API endpoints work correctly
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] Performance is acceptable
- [ ] No console errors
- [ ] Works on all browsers
- [ ] Responsive on all devices
- [ ] Accessible to all users

Happy testing! 🧪
