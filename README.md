# GetFit Fitness Tracking App

GetFit is a modern, modular fitness tracking application. It features calorie macro estimation, AI chatbot assistant, Leaflet maps integration, and a MediaPipe pose checking rep counter.

## Directory Layout
*(Refer to implementation plan for tree layout)*

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js (Optional, since frontend is served statically by FastAPI)

### Running Database Local Container
```bash
docker-compose up -d
```

### Running Backend API
```bash
cd backend
python -m venv venv
# Activate venv:
# Windows:
.\venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```
Open [http://localhost:8000](http://localhost:8000) in your browser to view the application.
