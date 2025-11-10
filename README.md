# AI-ASSISTED DIAGNOSTICS,  and TRIAGE 

Our project focuses on AI-assisted diagnostics and triage to enable faster and more accurate decision-making in healthcare. We developed an MVP diagnostic assistant powered by Gemini to analyze patient symptoms and provide preliminary assessments. Alongside this, we built a triage agent using clinical data and a trained XGBoost model, deployed through a FastAPI backend for real-time risk classification. This integrated system helps prioritize critical patients efficiently, supporting frontline medical teams in urgent care environments.

---
## System Overview

- **Frontend:** React + Vite for dashboards and triage visualization  
- **Backend:** Python (Flask/FastAPI) for API (triage scoring)
- **Database:** In memory allocation for MVP 
- **Communication:** REST APIs (JSON), WebSocket (for live triage updates)
- **AI Layer:** XGBoost for severity prediction

---

## ⚙️ Prerequisites

Before setup, ensure you have:

- **Node.js** ≥ 18.0.0  
- **npm** or **yarn**
- **Python** ≥ 3.9  
- **pip** (latest version)

---

## Frontend Setup (React)

Navigate to src folder
```bash
# Clone repo
git clone https://github.com/dhruthiaithal/Microlabs_Triage.git
cd src

# Install dependencies
npm install

#Start server
npm start
```
## Backend Setup (React)
Return to the main directory
```bash
# Create and activate a virtual environment:\
python -m venv venv
source venv/bin/activate   # (Linux/macOS)
venv\Scripts\activate      # (Windows)

#Install Python dependencies
pip install -r requirements.txt

#Run the Triage Agent (FastAPI):
#This agent runs the patient triage and prediction logic (integrated with frontend)

uvicorn triage:app --reload --port 8000

```
# Key Features
1. AI-Assisted Diagnostics using Gemini for rapid symptom analysis.
2. Automated Triage System powered by a trained XGBoost model.
3. Real-time risk classification into Green, Yellow, and Red categories.
4. FastAPI backend enabling quick and scalable model predictions.
5. Minimal input requirement — works with basic vitals and symptoms.
6. Supports frontline decision-making in emergency care settings.