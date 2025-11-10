import os
import random
import pickle
import pandas as pd
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime

# CONFIGURATION
DATA_DIR = "data"
MODEL_PATH = os.path.join("models", "xgb_model_risk1.pkl")
TRIAGE_OUTPUT_PATH = os.path.join(DATA_DIR, "triage_output.csv")
PATIENT_STATUS_PATH = os.path.join(DATA_DIR, "patient_status.csv")

app = FastAPI(title="Agentic Triage Service")

# Allow frontend requests (React/Streamlit)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL = None

# MODEL LOADING
@app.on_event("startup")
async def load_model():
    global MODEL
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                MODEL = pickle.load(f)
            print(f"Model loaded from {MODEL_PATH}")
        except Exception as e:
            MODEL = None
            print(f"Error loading model: {e}. Running in rule-based mode.")
    else:
        print(f"Model file not found at {MODEL_PATH}. Using rule-based triage logic.")

# DATA MODELS
class Patient(BaseModel):
    age: int
    sex: int
    hr: float
    sbp: float
    dbp: float
    rr: float
    spo2: float
    temp: float
    dyspnea: int
    chest_pain: int
    confusion: int
    comorb: int
    pulse_pressure: float
    map: float
    shock_index: float
    abnormal_count: int

class PredictionResult(BaseModel):
    risk: str
    intervention: str

# RULE-BASED INTERVENTION FUNCTION
def rule_based_intervention(patient: Patient, risk_class: str) -> str:
    """Return recommended intervention based on risk and vitals"""
    if patient.spo2 < 88:
        return 'Oxygen'
    elif risk_class.lower() == 'immediate (red)':
        return 'ICU'
    elif patient.hr > 130 or patient.sbp < 80 or patient.shock_index > 1.2:
        return 'Ventilator'
    else:
        return 'Nil'

# TRIAGE LOGIC
def get_rule_based_prediction(patient: Patient) -> PredictionResult:
    """Fallback logic for triage when ML model is available."""
    if patient.shock_index > 0.9 or patient.sbp < 90:
        risk = "Immediate (RED)"
    elif patient.abnormal_count >= 3 or patient.confusion == 1 or patient.chest_pain == 1:
        risk = "Delayed (YELLOW)"
    elif patient.hr < 100 and patient.sbp > 100 and patient.spo2 > 95:
        risk = "Minimal (GREEN)"
    else:
        risk = random.choice(["Delayed (YELLOW)", "Minimal (GREEN)"])

    intervention = rule_based_intervention(patient, risk)
    return PredictionResult(risk=risk, intervention=intervention)

def get_model_prediction(patient: Patient) -> PredictionResult:
    """Predicts risk using ML model if available, else rule-based."""
    if MODEL is None:
        return get_rule_based_prediction(patient)

    try:
        # Convert patient data to a DataFrame for model input
        input_df = pd.DataFrame([{
            "age": patient.age,
            "sex": patient.sex,
            "hr": patient.hr,
            "sbp": patient.sbp,
            "dbp": patient.dbp,
            "rr": patient.rr,
            "spo2": patient.spo2,
            "temp": patient.temp,
            "dyspnea": patient.dyspnea,
            "chest_pain": patient.chest_pain,
            "confusion": patient.confusion,
            "comorb": patient.comorb,
            "pulse_pressure": patient.pulse_pressure,
            "map": patient.map,
            "shock_index": patient.shock_index,
            "abnormal_count": patient.abnormal_count
        }])

        pred_class = MODEL.predict(input_df)[0]

        if pred_class == 0:
            risk = "Minimal (GREEN)"
        elif pred_class == 1:
            risk = "Delayed (YELLOW)"
        else:
            risk = "Immediate (RED)"

        intervention = rule_based_intervention(patient, risk)
        return PredictionResult(risk=risk, intervention=intervention)

    except Exception as e:
        print(f"Model prediction error: {e}. Falling back to rule-based logic.")
        return get_rule_based_prediction(patient)

# Utility
def map_risk_to_score(risk: str) -> float:
    """Converts risk category to numeric severity score (0-1)."""
    if "RED" in risk:
        return 0.9
    elif "YELLOW" in risk:
        return 0.6
    else:
        return 0.2

def run_triage_on_csv(input_path: str, output_path: str):
    """Reads patient_status.csv, runs triage predictions, and saves triage_output.csv"""
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    df = pd.read_csv(input_path)
    print(f"Loaded {len(df)} patients for triage.")

    results = []
    for _, row in df.iterrows():
        patient = Patient(**row.to_dict())
        pred = get_model_prediction(patient)
        severity_score = map_risk_to_score(pred.risk)
        results.append({
            "patient_id": row.get("patient_id", f"PX{random.randint(1000,9999)}"),
            "name": row.get("name", "Unknown"),
            "age": patient.age,
            "severity_score": severity_score,
            "risk": pred.risk,
            "intervention": pred.intervention,
            "location": row.get("location", random.choice(["North", "South", "East", "West", "Central"])),
        })

    triage_df = pd.DataFrame(results)
    triage_df.to_csv(output_path, index=False)
    print(f"Triage results saved → {output_path} ({len(triage_df)} entries)")
    return triage_df

# FASTAPI ROUTES
@app.get("/")
def root():
    return {
        "status": "Triage Agent Running",
        "model_loaded": MODEL is not None,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/predict", response_model=List[PredictionResult])
async def predict_triage(patients: List[Patient]):
    if not patients:
        raise HTTPException(status_code=400, detail="No patient data provided.")

    results = []
    for patient_data in patients:
        pred = get_model_prediction(patient_data)
        results.append(pred)

    return results

# CLI EXECUTION (Agentic mode)
if __name__ == "__main__":
    print("Running Triage Agent (Agentic mode)...")
    os.makedirs(DATA_DIR, exist_ok=True)
    triage_df = run_triage_on_csv(PATIENT_STATUS_PATH, TRIAGE_OUTPUT_PATH)
    print(triage_df.head())