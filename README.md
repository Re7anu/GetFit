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

## Scientific Calculation Sources & Scientific Formulations

GetFit relies on peer-reviewed clinical guidelines, sports physiology literature, and international health standards for all metabolic, macro, micro, and workout calculations:

### 🔬 1. Metabolic Engine (BMR & TDEE)
- **Mifflin-St Jeor Equation (1990):** Standard BMR baseline for non-bodyfat inputs.
  - *Reference:* Mifflin MD, St Jeor ST, et al. *"A new predictive equation for resting energy expenditure in healthy individuals."* Am J Clin Nutr. 1990;51(2):241-247.
- **Katch-McArdle Formula (1996):** LBM-based BMR equation applied when body fat percentage is provided:
  $$\text{BMR} = 370 + 21.6 \times (1 - \text{body\_fat\_fraction}) \times \text{weight\_kg}$$
  - *Reference:* Katch WD, McArdle WD. *"Nutrition, Weight Control, and Exercise."* Lea & Febiger, 1996.
- **Physical Activity Level (PAL) Multipliers:**
  - *Reference:* FAO/WHO/UNU Expert Consultation. *"Human Energy Requirements."* Food and Nutrition Technical Report Series, 2004.

### 🥩 2. Macronutrient Target Splits
- **Protein Intake Targets ($1.6\text{g/kg}$ to $2.2\text{g/kg}$):** Preserves lean tissue during caloric deficit ($2.2\text{g/kg}$) and optimizes muscle protein synthesis ($2.0\text{g/kg}$).
  - *Reference:* Jäger R, Kerksick CM, et al. *"International Society of Sports Nutrition Position Stand: protein and exercise."* J Int Soc Sports Nutr. 2017;14:20.
  - *Reference:* Thomas DT, Erdman KA, Burke LM. *"American College of Sports Medicine Joint Position Statement: Nutrition and Athletic Performance."* Med Sci Sports Exerc. 2016;48(3):543-568.
- **Fat & Carbohydrate Distribution:** $25\%$ of TDEE allocated to essential fatty acids; remaining caloric balance allocated to complex carbohydrates ($1\text{g fat} = 9\text{ kcal}$, $1\text{g carb} = 4\text{ kcal}$).

### 🥗 3. Essential Micronutrient Standards (RDAs & DRIs)
GetFit monitors 6 essential micronutrients using Recommended Dietary Allowances (RDA) and Dietary Reference Intakes (DRI):
- **Dietary Fiber ($30\text{ g/day}$):** WHO guideline for cardiovascular and gut metabolic health.
  - *Reference:* World Health Organization (WHO). *"Diet, Nutrition and the Prevention of Chronic Diseases."* WHO Technical Report Series 916, 2003.
- **Sodium ($2,300\text{ mg/day}$ upper limit):** NIH / American Heart Association upper intake threshold.
- **Potassium ($3,400\text{ mg/day}$ RDA):** National Academy of Medicine DRI for adults.
- **Vitamin C ($90\text{ mg/day}$ RDA):** NIH Office of Dietary Supplements recommended daily allowance.
- **Calcium ($1,000\text{ mg/day}$ RDA):** NIH DRI for adult bone mineral density maintenance.
- **Iron ($18\text{ mg/day}$ RDA):** NIH DRI standard for adult intake.
- **Food Data Reference:** Nutritional profiles parsed by Gemini AI are validated against the **USDA FoodData Central Foundation Database** (*U.S. Department of Agriculture, Agricultural Research Service*).

### 🏃 4. Exercise Calorie Expenditure & MET Calculations
- **Ainsworth Compendium of Physical Activities (2011 Revision):** Scientific source for baseline Metabolic Equivalent of Task (MET) values across activities.
  - *Reference:* Ainsworth BE, Haskell WL, et al. *"2011 Compendium of Physical Activities: a second update of codes and MET values."* Med Sci Sports Exerc. 2011;43(8):1575-1581.
- **Solution A Net MET Energy Expenditure:** Subtracts baseline resting metabolism ($1.2\text{ MET}$) to prevent double-counting resting calories during exercise:
  $$\text{Net Burn} = (\text{Active MET} - 1.2) \times \text{User Weight (kg)} \times \left(\frac{\text{Duration (mins)}}{60}\right)$$
  - *Reference:* Swartz AM, et al. *"Estimation of energy expenditure using METs during physical activity."* Med Sci Sports Exerc. 2000.

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
│   │   │   │   ├── nutrition_log.py
│   │   │   │   └── workout_log.py
│   │   │   └── session.py
│   │   └── schemas/         <-- Pydantic Contracts
│   │       ├── analytics.py
│   │       ├── nutrition_log.py
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
