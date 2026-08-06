# GetFit — Technical Context & Architectural Summary

## 📌 Project Overview

**GetFit** is a full-stack, high-performance health tracking, caloric pace intelligence, micronutrient monitoring, and AI-assisted workout logging system.

The application combines evidence-based physiological formulas (Mifflin-St Jeor, Katch-McArdle, Ainsworth Compendium of Physical Activities) with multimodal AI (Google Gemini 1.5 Flash Vision & Text Parsing) and real-time computer vision (MediaPipe Pose Client Motion Tracking with backend 3D joint angle evaluation).

---

## 🛠️ Technology Stack

- **Backend Framework:** FastAPI (Python 3.10+)
- **Database & ORM:** PostgreSQL / SQLite with SQLAlchemy 2.0 & Pydantic v2
- **Authentication & Security:** JWT (Access & Refresh Tokens with SHA-256 token hashing and timezone-aware UTC datetimes), Bcrypt password hashing
- **AI & Multimodal Engine:** Official Google GenAI SDK (`google-genai`), Gemini 1.5 Flash
- **Computer Vision & Pose Tracking:** MediaPipe Pose & Camera Utils CDN (Client-side keypoint detection) + Dedicated Backend Math Service (`pose_estimation_service.py` for 3D vector angle calculation)
- **Frontend Architecture:** Vanilla JavaScript (ES Modules), Vanilla CSS (Custom Design System with Glassmorphism, HSL color tokens, Inter/Nunito typography)

---

## 🔬 Core Domain Logic & Scientific Formulations

### 1. Metabolic & Caloric Pace Engine
- **Mifflin-St Jeor BMR Equation:**
  $$\text{BMR}_{\text{male}} = (10 \times \text{weight}_{\text{kg}}) + (6.25 \times \text{height}_{\text{cm}}) - (5 \times \text{age}) + 5$$
  $$\text{BMR}_{\text{female}} = (10 \times \text{weight}_{\text{kg}}) + (6.25 \times \text{height}_{\text{cm}}) - (5 \times \text{age}) - 161$$
- **Katch-McArdle Equation:** Applied when body fat percentage is provided:
  $$\text{BMR} = 370 + 21.6 \times (1 - \text{body\_fat\_fraction}) \times \text{weight\_kg}$$
- **Physical Activity Level (PAL) Multipliers:** `sedentary: 1.200`, `lightly_active: 1.375`, `moderately_active: 1.550`, `very_active: 1.725`, `extra_active: 1.900`.
- **Dynamic Caloric Pace Equation:**
  $$\text{Daily Caloric Pace} = \frac{(\text{target\_weight\_kg} - \text{weight\_kg}) \times 7,700 \text{ kcal}}{\text{timeline\_weeks} \times 7}$$

### 2. Food & Micronutrient Intelligence
- **Macronutrient Budgets:** Bodyweight-based protein scaling ($1.2\text{ g/kg}$ to $2.5\text{ g/kg}$) based on fitness focus, with a $25\%$ minimum fat floor to protect endocrine health.
- **6 Essential Micronutrients Tracked (WHO / NIH RDA Standards):**
  - **Fiber:** $30\text{ g/day}$
  - **Sodium:** $2,300\text{ mg/day}$ (Upper Limit)
  - **Potassium:** $3,400\text{ mg/day}$
  - **Vitamin C:** $90\text{ mg/day}$
  - **Calcium:** $1,000\text{ mg/day}$
  - **Iron:** $18\text{ mg/day}$
- **Gemini Multimodal AI Parsing (`POST /api/v1/nutrition/meals/ai-parse`):** Processes food images or text prompts to extract macros and micros.

### 3. Solution A Net MET Exercise Engine
- **Net MET Expenditure Equation:** Prevents double-counting baseline resting BMR calories during exercise:
  $$\text{Net MET} = \max(\text{Active MET} - 1.2, 0.0)$$
  $$\text{Net Calories Burned} = \text{Net MET} \times \text{User Weight (kg)} \times \left(\frac{\text{Duration (mins)}}{60}\right)$$
- **Mass Load Multiplier (Strength Workouts):**
  $$\text{Mass Multiplier} = \frac{\text{Body Weight} + \text{External Weight}}{\text{Body Weight}}$$

### 4. AI Motion Pose Tracking & Rep Counter
- **Client Camera Motion Tracking:** Captures 33 3D MediaPipe pose landmarks.
- **Dedicated Backend Pose Service (`app/services/pose_estimation_service.py`):** Calculates 3D joint angles using dot product vector trigonometry:
  $$\theta = \arccos\left(\frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\| \|\vec{v}\|}\right) \times \frac{180}{\pi}$$
- Real-time state machine tracks rep stages (`UP` $\rightarrow$ `DOWN` $\rightarrow$ `UP`) for Squats, Push-ups, and Bicep Curls with live form feedback.
- Fullscreen mode includes floating side docks for exercise switching and live added weight input steppers.

---

## 🏗️ System Architecture & File Structure

```text
GetFit/
├── backend/
│   ├── app/
│   │   ├── api/                     <-- FastAPI Controllers / Route Handlers
│   │   │   ├── analytics.py
│   │   │   ├── auth.py
│   │   │   ├── nutrition.py
│   │   │   ├── profiles.py
│   │   │   ├── users.py
│   │   │   └── workouts.py
│   │   ├── services/                <-- Isolated Business Logic Services
│   │   │   ├── ai_service.py        <-- Multi-provider LiteLLM completion service & structured fallback cascades
│   │   │   ├── analytics_service.py <-- Trend analytics & daily progress computation
│   │   │   ├── auth_service.py
│   │   │   ├── nutrition_service.py
│   │   │   ├── pose_estimation_service.py  <-- Dedicated 3D Pose Evaluation
│   │   │   ├── profile_service.py
│   │   │   └── workout_service.py
│   │   ├── core/                    <-- Physiological Formulas & Catalogs
│   │   │   ├── exercise_catalog.py
│   │   │   ├── formulas.py
│   │   │   ├── auth_security.py
│   │   │   └── prompts.py
│   │   ├── db/                      <-- Database Models & Sessions
│   │   │   ├── models/
│   │   │   │   ├── daily_target.py
│   │   │   │   ├── nutrition_log.py
│   │   │   │   ├── profile.py
│   │   │   │   ├── token.py
│   │   │   │   ├── user_auth.py
│   │   │   │   ├── workout_log.py
│   │   │   │   └── workout_plan.py
│   │   │   └── session.py
│   │   └── schemas/                 <-- Pydantic Contracts
│   ├── tests/                       <-- Pytest Integration Test Suite
│   └── seed_dummy_history.py
├── frontend/                        <-- Single Page Web Application
│   ├── index.html                   <-- App Shell & CDN Imports
│   └── src/
│       ├── css/                     <-- Modular CSS Design System
│       │   ├── variables.css
│       │   ├── main.css
│       │   └── components.css
│       └── js/                      <-- Modular ES Javascript Controllers
│           ├── api_client.js
│           ├── app.js               <-- View Router & Workouts Hub Navigation
│           ├── auth.js
│           ├── dashboard.js
│           ├── logging.js
│           ├── analytics.js
│           ├── pose_tracker.js      <-- Live Pose HUD & Fullscreen Side Docks
│           └── workout_plan.js
├── README.md
└── context.md                       <-- Project Architectural Context
```

---

## 🚦 Common Commands

### Run Backend & Web App Server (PowerShell)
```powershell
cd C:\Users\rehan\OneDrive\Desktop\GetFit\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
- Web Application UI: `http://localhost:8000`
- Interactive API Docs: `http://localhost:8000/docs`

### Run Pytest Test Suite
```powershell
cd C:\Users\rehan\OneDrive\Desktop\GetFit\backend
.\venv\Scripts\python.exe -m pytest
```

### Seed Dummy 30-Day History Data
```powershell
cd C:\Users\rehan\OneDrive\Desktop\GetFit\backend
.\venv\Scripts\python.exe seed_dummy_history.py
```
