# GetFit: Personalized Health, Micronutrients & Caloric Pace Intelligence API

**GetFit** is a full-stack, high-performance application for personalized health tracking, dynamic caloric pace calculations, micronutrient intelligence (WHO/NIH RDAs), workout logging, automated nightly email reporting, and natural-language AI parsing powered by **LiteLLM** (supporting multi-provider LLMs with fallback cascades).

Built with **FastAPI**, **PostgreSQL**, **SQLAlchemy 2.0**, **Pydantic v2**, **LiteLLM**, and **Loguru**, GetFit implements a clean **Layered Architecture** with $O(1)$ database read optimization.

---

## 🌟 Core Application Features

### 🔐 1. Pure Authentication & Token Security
- **Email/Password Registration:** Strict email pattern validation, strong password rules, and Bcrypt password hashing.
- **Dual JWT Token Architecture:** Access tokens (30 min lifetime) and refresh tokens (7 day lifetime) stored in PostgreSQL with token revocation support.
- **Role-Based Protected Routes:** Dependency-injected authentication guards for all private API endpoints.

### 🎯 2. Physical Profile & Dynamic Caloric Pace Engine
- **Single-Pass Calculation:** Mifflin-St Jeor BMR equation and TDEE activity multipliers (1.2 to 1.9).
- **Dynamic Caloric Pace Equation:** Calculates exact daily calorie deficit/surplus required to reach a target weight within a specified timeline in weeks:
  $$\text{Daily Caloric Pace (kcal/day)} = \frac{(\text{Target Weight in kg} - \text{Current Weight in kg}) \times 7700}{\text{Timeline in weeks} \times 7}$$
- **Body-Weight Macro Target Budget:** Evidence-based protein (1.2 to 2.5 g/kg body mass), carbs, and fat target budgets calculated dynamically based on fitness focus.

### 🥗 3. Food & Meal Logging Engine (Macros + Micronutrient Intelligence)
- **Essential Micronutrient Tracking:** Tracks **Fiber (g)**, **Sodium (mg)**, **Potassium (mg)**, **Vitamin C (mg)**, **Calcium (mg)**, and **Iron (mg)** using WHO / NIH RDA standards.
- **Multimodal AI Food Scanner (`POST /api/v1/nutrition/meals/ai-image-parse`):** Upload meal photos for instant computer vision analysis, macro estimation, and micronutrient extraction.
- **LiteLLM AI Natural Language Parsing (`POST /api/v1/nutrition/meals/ai-parse`):** Parses natural text prompts (e.g., *"2 boiled eggs, whole wheat toast, and an orange"*) into structured JSON extracting macronutrients and micronutrients.
- **Manual Meal Logging (`POST /api/v1/nutrition/meals`):** Full CRUD logging with custom macro/micro overrides.

### 🏃 4. Exercise Logging & Net MET Burn Engine
- **Solution A Net MET Formula:** Eliminates double-counting baseline resting calories during workouts:
  $$\text{Net MET} = \max(\text{Active MET} - \text{Baseline MET}, 0)$$
  $$\text{Net Calories Burned} = \text{Net MET} \times \text{User Weight in kg} \times \left(\frac{\text{Duration in minutes}}{60}\right)$$
- **Ainsworth Exercise Catalog (`GET /api/v1/workouts/catalog`):** 2-step structured catalog supporting Distance-based, Reps & Sets (Pushups, Squats, Pullups, Lunges), and Time-based sports (Football, Cricket, Padel).
- **Strength Load Scaling:** Dynamically scales exercise intensity based on external barbell/dumbbell load added relative to body weight.
- **LiteLLM AI Workout Parsing (`POST /api/v1/workouts/logs/ai-parse`):** Parses freeform text descriptions to infer MET values, set details, and duration.

### 📊 5. Health & Workout Analytics System
- **30-Day Goal Calendar & Caloric Graph (`GET /api/v1/analytics/history`):** Dedicated analytics domain evaluating daily goal performance snapshots (`is_goal_hit`).
- **Granular Day Detail Breakdown (`GET /api/v1/analytics/day-detail`):** Interactive modal fetching historical meals and workouts for any selected past date.

### ✉️ 6. Unified Logging & Automated Email Reporting System
- **Loguru Centralized Logging:** Unified logging with standard library log interception, colorized terminal output, and 10MB / 14-day rotating log files (`backend/logs/`).
- **APScheduler & Resend Email Reports:** Automated nightly background worker dispatches rich HTML health summaries and AI-generated progress insights directly to user emails.

---

## 📁 Project Structure

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
│   │   │   ├── ai_service.py
│   │   │   ├── analytics_service.py
│   │   │   ├── auth_service.py
│   │   │   ├── email_report_service.py
│   │   │   ├── nutrition_service.py
│   │   │   ├── profile_service.py
│   │   │   └── workout_service.py
│   │   ├── core/            <-- Core Config, Logging, Constants & Prompts
│   │   │   ├── auth_security.py
│   │   │   ├── constants.py
│   │   │   ├── exercise_catalog.py
│   │   │   ├── formulas.py
│   │   │   ├── logging_config.py
│   │   │   ├── prompts.py
│   │   │   └── scheduler.py
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

## 🚀 Setup & Running the Application

### 1. Prerequisites
- Python 3.10+
- PostgreSQL running on `localhost:5433` (or configured database URL)

### 2. Environment Configuration
Ensure `.env` exists in the root directory (or `backend/.env`):

```env
# FastAPI Settings
PROJECT_NAME="GetFit API"
API_V1_STR="/api/v1"
SECRET_KEY="your-super-secret-key-change-in-production"
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Database Configuration
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5433/getfit"

# LLM AI Configuration (LiteLLM)
LLM_API_KEY="your_primary_llm_api_key_here"
LLM_API_KEY_SECONDARY=""
LLM_MODEL_NAME="gemini/gemini-1.5-flash"
LLM_FALLBACK_MODEL_NAME="gemini/gemini-1.5-pro"

# Email Configuration (Resend)
RESEND_API_KEY="your_resend_api_key_here"
RESEND_FROM_EMAIL="GetFit Daily <onboarding@resend.dev>"
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

Use `.\venv\Scripts\python.exe -m uvicorn` (Windows) or `python -m uvicorn` with your active virtual environment:

```powershell
# Navigate to backend directory
cd backend

# Run with Windows Virtual Environment Python executable:
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# Or using activated virtual environment:
python -m uvicorn app.main:app --reload --port 8000
```

- **Web Application UI:** Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.
- **Interactive Swagger API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc Documentation:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Running Automated Tests

Run the complete Pytest integration and unit test suite:

```powershell
python -m pytest
```
*(All 17 integration & unit tests passing cleanly with transactional database isolation).*

---

## 🔬 Scientific Calculation Sources & Scientific Formulations

GetFit relies on peer-reviewed clinical guidelines, sports physiology literature, biomechanical load models, and international health standards for all metabolic, macro, micro, and workout calculations:

### 1. Metabolic Engine (BMR & TDEE)
- **Mifflin-St Jeor Equation (1990):** Standard BMR baseline for non-bodyfat inputs:
  $$\text{BMR}_{\text{Male}} = 10 \times \text{Weight (kg)} + 6.25 \times \text{Height (cm)} - 5 \times \text{Age (years)} + 5$$
  $$\text{BMR}_{\text{Female}} = 10 \times \text{Weight (kg)} + 6.25 \times \text{Height (cm)} - 5 \times \text{Age (years)} - 161$$
  - *Reference:* Mifflin MD, St Jeor ST, et al. *"A new predictive equation for resting energy expenditure in healthy individuals."* Am J Clin Nutr. 1990;51(2):241-247.
- **Katch-McArdle Formula (1996):** Lean Body Mass (LBM) based BMR equation applied when body fat percentage is provided:
  $$\text{BMR} = 370 + 21.6 \times (1 - \text{Body Fat Fraction}) \times \text{Weight (kg)}$$
  - *Reference:* Katch WD, McArdle WD. *"Nutrition, Weight Control, and Exercise."* Lea & Febiger, 1996.
- **Physical Activity Level (PAL) Multipliers:** `sedentary: 1.200`, `lightly_active: 1.375`, `moderately_active: 1.550`, `very_active: 1.725`, `extra_active: 1.900`.
  - *Reference:* FAO/WHO/UNU Expert Consultation. *"Human Energy Requirements."* WHO Technical Report Series 925, 2004.

### 2. Macronutrient Target Splits & Hormone Guardrails
- **Protein Intake Targets (1.2 to 2.5 g/kg body weight):** Customized by fitness focus (Bodybuilding: 1.8 g/kg, Athletic: 1.6 g/kg, Sports Endurance: 1.4 g/kg, General Health: 1.2 g/kg).
  - *Reference:* Jäger R, Kerksick CM, et al. *"International Society of Sports Nutrition Position Stand: protein and exercise."* J Int Soc Sports Nutr. 2017;14:20.
  - *Reference:* Morton RW, et al. *"A systematic review, meta-analysis and trial of dietary protein supplementation during resistance training."* Br J Sports Med. 2018;52(6):376-384.
- **Deficit Protein Scaling:** Elevates protein intake during weight loss deficits (≥ 0.5 kg/week) to protect lean body mass from catabolism.
  - *Reference:* Helms ER, Zinn C, et al. *"A systematic review of dietary protein during caloric restriction in resistance-trained lean athletes."* Int J Sport Nutr Exerc Metab. 2014;24(2):127-138.
- **Fat & Hormone Safety Floors:** Enforces a minimum fat threshold of 25% calorie split, capped at a minimum of 0.6 g/kg or 35 g/day to prevent endocrine dysfunction and steroidogenesis impairment.
  - *Reference:* World Health Organization (WHO). *"Dietary fats and fatty acids in human nutrition."* FAO Food and Nutrition Paper 91, 2010.

### 3. Essential Micronutrient Standards (RDAs & DRIs)
Monitors 6 essential micronutrients using Recommended Dietary Allowances (RDA) and Dietary Reference Intakes (DRI):
- **Dietary Fiber (30 g/day):** WHO guideline for cardiovascular, metabolic, and gut microbiome health.
  - *Reference:* World Health Organization (WHO). *"Diet, Nutrition and the Prevention of Chronic Diseases."* WHO Technical Report Series 916, 2003.
- **Sodium (2,300 mg/day upper limit):** AHA / NIH Chronic Disease Risk Reduction threshold.
- **Potassium (3,400 mg/day RDA):** National Academy of Medicine DRI for adult blood pressure regulation.
- **Vitamin C (90 mg/day RDA):** NIH Office of Dietary Supplements recommended daily allowance.
- **Calcium (1,000 mg/day RDA):** NIH DRI for adult bone mineral density maintenance.
- **Iron (18 mg/day RDA):** NIH DRI standard for hemoglobin synthesis and oxygen transport.
- **Food Data Reference:** Validated against the **USDA FoodData Central Foundation Database** (*U.S. Department of Agriculture, Agricultural Research Service*).

### 4. Exercise MET & Net Calorie Expenditure
- **Ainsworth Compendium of Physical Activities (2011/2024 Revision):** Scientific source for baseline Metabolic Equivalent of Task (MET) values across activities (Codes 02010–02050).
  - *Reference:* Ainsworth BE, Haskell WL, et al. *"2011 Compendium of Physical Activities: a second update of codes and MET values."* Med Sci Sports Exerc. 2011;43(8):1575-1581.
- **Solution A Net MET Energy Expenditure:** Subtracts baseline resting metabolism (1.2 MET) to prevent double-counting resting calories during exercise:
  $$\text{Net Burn} = (\text{Active MET} - 1.2) \times \text{User Weight in kg} \times \left(\frac{\text{Duration in minutes}}{60}\right)$$
  - *Reference:* Swartz AM, et al. *"Estimation of energy expenditure using METs during physical activity."* Med Sci Sports Exerc. 2000.

### 5. Strength Training Mass Load & Session MET Engine
- **Mass Load Multiplier:** Scales MET intensity dynamically based on external barbell/dumbbell load:
  $$\text{Mass Multiplier} = \frac{\text{Body Weight} + \text{External Load}}{\text{Body Weight}}$$
  - *Reference:* US Army Research Institute of Environmental Medicine (USARIEM) Load Carriage Energy Cost Models (*Pandolf KB et al. J Appl Physiol 1977*).
- **Session Rest-Weighted MET Equation:** Combines active rep exertion at **Active MET** with 60s inter-set rest intervals at **3.0 METs** (Ainsworth Code 02050 standing/resting recovery):
  $$\text{Session MET} = \frac{(\text{Active MET} \times \text{Active Mins}) + (3.0 \times \text{Rest Mins})}{\text{Total Session Mins}}$$
  - *Reference:* NSCA Essentials of Strength Training and Conditioning (4th Ed.) & Schoenfeld BJ et al. *Sports Med 2015*.

### 6. Post-Exercise Recovery Macro Allocation Ratios
- **Cardio / Endurance Recovery:** 75% Carbs, 15% Protein, 10% Fat (3:1 to 4:1 Carb-to-Protein ratio for rapid muscle glycogen resynthesis via GLUT4 translocation).
- **Strength / Resistance Recovery:** 45% Protein, 45% Carbs, 10% Fat (1:1 Carb-to-Protein ratio for hypertrophic muscle protein synthesis and glycogen recovery).
- **General Fitness Recovery:** 20% Protein, 50% Carbs, 30% Fat (balanced physiological recovery).
  - *Reference:* Thomas DT, Erdman KA, Burke LM. *"American College of Sports Medicine Joint Position Statement: Nutrition and Athletic Performance."* Med Sci Sports Exerc. 2016;48(3):543-568.
