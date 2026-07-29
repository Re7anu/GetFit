# GetFit: Personalized Health, Micronutrients & Caloric Pace Intelligence API

**GetFit** is a high-performance application for personalized health tracking, dynamic caloric pace calculations, micronutrient intelligence (WHO/NIH RDAs), workout logging, and natural-language AI parsing powered by the official **Google GenAI SDK**.

Built with **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0**, **Pydantic v2**, and **Google Gemini AI**, GetFit implements a clean **Layered Architecture** with $O(1)$ database read optimization.

---

## Core Features

### 1. Pure Authentication & Token Security
- **Email/Password Registration:** Strict email pattern validation, strong password checks, and Bcrypt hashing.
- **JWT Session Security:** Access tokens (30 min lifetime) and refresh tokens (7 day lifetime) stored in PostgreSQL with token revocation support.

### 2. Physical Profile & Dynamic Caloric Pace Engine
- **Single-Pass Calculation:** Mifflin-St Jeor BMR equation and TDEE activity multipliers (1.2 to 1.9).
- **Dynamic Caloric Pace Equation:** Calculates exact daily calorie deficit/surplus required to reach a target weight within a specified timeline in weeks:
  $$\text{Daily Caloric Pace} = \frac{(\text{target\_weight\_kg} - \text{weight\_kg}) \times 7,700 \text{ kcal}}{\text{timeline\_weeks} \times 7}$$
- **Body-Weight Macro Target Split:** Evidence-based protein ($1.8\text{g/kg}$ to $2.0\text{g/kg}$ body mass), carbs, and fat target budgets.

### 3. Food & Meal Logging Engine (Macros + Micronutrient Intelligence)
- **Essential Micronutrient Tracking:** Tracks **Fiber (g)**, **Sodium (mg)**, **Potassium (mg)**, **Vitamin C (mg)**, **Calcium (mg)**, and **Iron (mg)** using WHO / NIH RDA standards.
- **Gemini AI Natural Language Parsing (`POST /api/v1/nutrition/meals/ai-parse`):** Parses natural text prompts (e.g. *"2 boiled eggs, whole wheat toast, and an orange"*) into structured JSON extracting both macronutrients and micronutrients.

### 4. Exercise Logging & Net MET Burn Engine
- **Solution A Net MET Formula:** Eliminates double-counting baseline resting calories during workouts:
  $$\text{Net MET} = \max(\text{Exercise MET} - \text{Baseline Activity Multiplier}, 0.0)$$
  $$\text{Net Calories Burned} = \text{Net MET} \times \text{User Weight (kg)} \times \left(\frac{\text{Duration (mins)}}{60}\right)$$
- **Ainsworth Exercise Catalog (`GET /api/v1/workouts/catalog`):** 2-step structured dropdown supporting Distance, Reps & Sets (Pushups, Squats, Pullups, Lunges), and Time-based sports (Football, Cricket, Padel).
- **Gemini AI Workout Parsing (`POST /api/v1/workouts/logs/ai-parse`):** Parses freeform workout descriptions to infer Ainsworth MET values and duration.

### 5. Health & Workout Analytics System
- **30-Day Goal Calendar & Caloric Graph (`GET /api/v1/analytics/history`):** Dedicated analytics domain evaluating daily goal performance snapshots (`is_goal_hit`).
- **Granular Day Detail Breakdown (`GET /api/v1/analytics/day-detail`):** Interactive modal fetching historical meals and workouts for any selected past date.

---

## Project Structure

```text
GetFit/
├── backend/
│   ├── app/
│   │   ├── api/             <-- Route Handlers & HTTP Controllers
│   │   │   ├── analytics.py
│   │   │   ├── auth.py
│   │   │   ├── nutrition.py
│   │   │   ├── profiles.py
│   │   │   ├── users.py
│   │   │   └── workouts.py
│   │   ├── services/        <-- Domain Business Logic & AI Orchestration
│   │   │   ├── analytics_service.py
│   │   │   ├── auth_service.py
│   │   │   ├── gemini_service.py
│   │   │   ├── nutrition_service.py
│   │   │   ├── profile_service.py
│   │   │   └── workout_service.py
│   │   ├── core/            <-- Formulas, Catalog & Prompts
│   │   │   ├── exercise_catalog.py
│   │   │   ├── formulas.py
│   │   │   ├── auth_security.py
│   │   │   └── prompts.py
│   │   ├── db/              <-- PostgreSQL Models & Session
│   │   │   ├── models/
│   │   │   └── session.py
│   │   └── schemas/         <-- Pydantic Contracts
│   │       ├── analytics.py
│   │       ├── food_log.py
│   │       ├── profile.py
│   │       └── workout_log.py
│   ├── seed_dummy_history.py
│   ├── view_db.py
│   └── tests/               <-- Pytest Test Suite
└── frontend/                <-- Modern Glassmorphism Web App
    ├── index.html
    └── src/
        ├── css/
        └── js/
```

---

## Setup & Running the Application

### 1. Prerequisites
- Python 3.10+
- PostgreSQL running on `localhost:5433` (or configured database URL)

### 2. Environment Configuration
Ensure `.env` exists inside `backend/.env`:

```env
PROJECT_NAME=GetFit API
API_V1_STR=/api/v1
SECRET_KEY=your-super-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5433/getfit
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_NAME=gemini-1.5-flash
```

### 3. Setup Virtual Environment & Install Dependencies
```powershell
# Navigate to backend directory
cd backend

# Create virtual environment (if not already created)
python -m venv venv

# Activate Virtual Environment:
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

# On Windows Command Prompt:
.\venv\Scripts\activate.bat

# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Seed Historical Data & Test Accounts
```powershell
# Seed 30-day realistic dummy logs and test accounts
python seed_dummy_history.py
```

### 5. Run the Application Server

Use `python -m uvicorn` to ensure it executes using your active virtual environment Python binary:

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

- **Web Application UI:** Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.
- **Interactive Swagger API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Running Automated Tests

Run the complete Pytest integration and unit test suite:

```powershell
python -m pytest
```
*(All 11 integration tests passing cleanly with transactional database isolation).*
