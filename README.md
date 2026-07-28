# GetFit: Personalized Fitness & Nutrition Intelligence API

**GetFit** is a high-performance backend application for personalized health tracking, dynamic caloric pace calculations, meal/workout logging, and natural-language AI parsing powered by the official **Google GenAI SDK**.

Built with **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0**, **Pydantic v2**, and **Google Gemini AI**, GetFit implements a clean **3-Tier Layered Architecture** with $O(1)$ database read optimization.

---

## Core Features

### 1. Pure Authentication & Token Security
- **Email/Password Registration:** Strict email pattern validation, strong password checks, and Bcrypt hashing.
- **JWT Session Security:** Access tokens (30 min lifetime) and refresh tokens (7 day lifetime) stored in PostgreSQL with token revocation support.

### 2. Physical Profile & Dynamic Caloric Pace Engine
- **Single-Pass Calculation:** Mifflin-St Jeor BMR equation and TDEE activity multipliers (1.2 to 1.9).
- **Dynamic Caloric Pace Equation:** Calculates exact daily calorie deficit/surplus required to reach a target weight within a specified timeline in weeks:
  $$\text{Daily Caloric Pace} = \frac{(\text{target\_weight\_kg} - \text{weight\_kg}) \times 7,700 \text{ kcal}}{\text{timeline\_weeks} \times 7}$$
- **Macro Target Split:** Auto-calculates protein ($1.6\text{g/kg}$ to $2.2\text{g/kg}$), carbs, and fat target budgets.
- **Safety Guardrails:** Enforces minimum safe calorie floors ($1,200\text{ kcal/day}$ for females, $1,500\text{ kcal/day}$ for males) and provides suggested minimum timeline weeks.

### 3. Food & Meal Logging Engine (Manual & Gemini AI)
- **Manual Meal Logging:** Logs meal type, description, calories, protein (g), carbs (g), fat (g), and quantity (g).
- **Gemini AI Natural Language Parsing (`POST /api/v1/nutrition/meals/ai-parse`):** Parses natural text prompts (e.g. *"2 boiled eggs and whole wheat toast with butter"*) into structured JSON using Google's official `response_schema` and `response.parsed` mechanism.

### 4. Exercise Logging & Solution A (Net MET) Burn Engine
- **Solution A Net MET Formula:** Eliminates double-counting baseline resting calories during workouts:
  $$\text{Net MET} = \max(\text{Exercise MET} - \text{Baseline Activity Multiplier}, 0.0)$$
  $$\text{Net Calories Burned} = \text{Net MET} \times \text{User Weight (kg)} \times \left(\frac{\text{Duration (mins)}}{60}\right)$$
- **Gemini AI Workout Parsing (`POST /api/v1/exercises/logs/ai-parse`):** Parses freeform workout descriptions (e.g. *"45 mins heavy squats"*) to infer Ainsworth MET values and duration automatically.

### 5. Live Net Daily Caloric & Macro Budget Consolidation
- **Dynamic Daily Summary (`GET /api/v1/nutrition/summary/today`):** Consolidates base calorie targets, consumed food calories, and Net MET exercise credits:
  $$\text{Adjusted Target} = \text{Base Target} + \text{Net Exercise Credits}$$
  $$\text{Remaining Budget} = \text{Adjusted Target} - \text{Consumed Calories}$$

---

## 3-Tier Layered Architecture

GetFit enforces strict separation of concerns across 3 independent tiers:

```text
GetFit/
├── backend/
│   ├── app/
│   │   ├── api/             <-- Tier 1: Route Handlers & HTTP Validation
│   │   │   ├── auth.py
│   │   │   ├── profiles.py
│   │   │   ├── nutrition.py
│   │   │   └── exercises.py
│   │   ├── services/        <-- Tier 2: Domain Business Logic & AI Orchestration
│   │   │   ├── auth_service.py
│   │   │   ├── profile_service.py
│   │   │   ├── nutrition_service.py
│   │   │   ├── exercise_service.py
│   │   │   └── gemini_service.py
│   │   ├── core/            <-- Formulas, Security & Prompts
│   │   │   ├── formulas.py
│   │   │   ├── auth_security.py
│   │   │   └── prompts.py
│   │   ├── db/              <-- Tier 3: PostgreSQL Models & Session
│   │   │   ├── models/
│   │   │   └── session.py
│   │   └── schemas/         <-- Pydantic Data Contracts
│   │       ├── food_log.py
│   │       └── exercise_log.py
│   └── tests/               <-- Pytest Test Suite
```

---

## Technology Stack

- **Framework:** FastAPI (Python 3.10+)
- **Database:** PostgreSQL (SQLAlchemy 2.0 ORM + Psycopg2)
- **Validation:** Pydantic v2 & Pydantic-Settings
- **Security:** Passlib (Bcrypt), Python-Jose (JWT)
- **AI Integration:** Official Google GenAI SDK (`google-genai` version 2.14.0+)
- **Testing:** Pytest (Transactional rollbacks for per-test DB isolation)

---

## Setup & Installation Guide

### 1. Prerequisites
- Python 3.10+
- PostgreSQL running on `localhost:5433` (or configured database URL)

### 2. Environment Configuration
Create a `.env` file inside `backend/.env`:

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

### 3. Install Dependencies
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4. Initialize Database Tables
```powershell
python -m app.db.init_db
```

### 5. Run the Server
```powershell
uvicorn app.main:app --reload --port 8000
```

- **Interactive Swagger UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## Running Automated Tests

Run the complete Pytest integration & unit test suite:

```powershell
pytest
```
*(10 tests passing cleanly with transactional database isolation).*
