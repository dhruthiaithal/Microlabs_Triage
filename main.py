from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import google.generativeai as genai
from dotenv import load_dotenv
import os
from pydantic import BaseModel, Field, validator
from typing import Optional
import logging

# ---------------------------------------------------
# CONFIG
# ---------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key and os.getenv("MOCK_MODE", "0") not in ("1", "true", "True"):
    raise ValueError("Set GOOGLE_API_KEY in your .env file")

MODEL_NAME = "models/gemini-pro"
MOCK_MODE = os.getenv("MOCK_MODE", "0") in ("1", "true", "True")
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)

app = FastAPI(title="Fever Diagnostic Assistant")

# ---------------------------------------------------
# CORS (allow typical local dev origins)
# ---------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "file://"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------
# STATIC FRONTEND
# ---------------------------------------------------
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# ---------------------------------------------------
# Pydantic model for input
# ---------------------------------------------------
class PatientSymptoms(BaseModel):
    temperature: float = Field(..., ge=95, le=110, description="Temperature in Fahrenheit")
    duration: int = Field(..., ge=0, le=365)
    additional_symptoms: str = Field(..., min_length=5, max_length=2000)
    medical_history: Optional[str] = Field(None, max_length=2000)
    medications: Optional[str] = Field(None, max_length=2000)

    @validator("temperature")
    def check_temp(cls, v):
        if not (95 <= v <= 110):
            raise ValueError("Temperature must be between 95°F and 110°F")
        return v

# ---------------------------------------------------
# Helper functions
# ---------------------------------------------------
def canned_response(symptoms: PatientSymptoms) -> str:
    """Return a mock response for testing without Gemini API."""
    risk = "Medium"
    if symptoms.temperature >= 103:
        risk = "High"
    elif symptoms.temperature < 100.4:
        risk = "Low"

    return f"""**Risk Level:** {risk}

**Temperature:** {symptoms.temperature}°F for {symptoms.duration} days

**Possible Causes:**
- Viral infection (flu, COVID-19)
- Bacterial infection
- Dehydration
- Heat exhaustion

**Immediate Actions:**
- Rest and hydrate well
- Take acetaminophen or ibuprofen as directed
- Monitor temperature every 4 hours
- Isolate if contagious

**Seek Emergency Care If:**
- Temperature exceeds 104°F
- Difficulty breathing
- Chest pain
- Confusion or persistent vomiting

**Home Care Tips:**
- Drink plenty of fluids
- Use cool compresses
- Wear light clothing
- Keep room temperature comfortable

*This is a mock analysis. In production, configure your GOOGLE_API_KEY.*"""

def init_model():
    """Initialize the Gemini model."""
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(MODEL_NAME)
        logger.info(f"Initialized Gemini model: {MODEL_NAME}")
        return model
    except Exception as e:
        logger.error(f"Gemini init failed: {e}")
        return None

model = None

def analyze_fever(symptoms: PatientSymptoms) -> str:
    global model
    if MOCK_MODE:
        return canned_response(symptoms)

    if model is None:
        model = init_model()
        if model is None:
            return canned_response(symptoms)

    prompt = f"""
You are a clinical AI assistant. Analyze these symptoms and return concise, structured advice.

Temperature: {symptoms.temperature}°F
Duration: {symptoms.duration} days
Symptoms: {symptoms.additional_symptoms}
Medical History: {symptoms.medical_history or "None"}
Medications: {symptoms.medications or "None"}

Provide:
1. Risk Assessment (Low/Medium/High)
2. Possible Causes (3-5)
3. Immediate Actions
4. When to Seek Emergency Care
5. Home Care Tips

End with: "This is AI-generated and not a medical diagnosis."
"""
    try:
        response = model.generate_content(prompt)
        if not response or not response.text:
            raise ValueError("Empty response")
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini error: {e}")
        return canned_response(symptoms)

# ---------------------------------------------------
# Routes
# ---------------------------------------------------
@app.on_event("startup")
async def startup():
    global model
    if not MOCK_MODE:
        model = init_model()
    logger.info("Fever Diagnostic Assistant ready.")

@app.get("/")
async def root():
    return RedirectResponse(url="/static/index.html")

@app.get("/health")
async def health():
    return {"status": "ok", "mock_mode": MOCK_MODE, "model_loaded": model is not None}

@app.post("/analyze")
async def analyze(request: Request):
    """Accept JSON body, validate explicitly, then run analysis.

    This prevents silent 422 responses by catching JSON decode/validation
    errors and returning informative messages to the client.
    """
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse JSON body: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    logger.info(f"/analyze payload: {payload}")

    try:
        symptoms = PatientSymptoms.model_validate(payload)
    except Exception as e:
        logger.error(f"Payload validation error: {e}")
        # Return 422 with details so frontend can display what was wrong
        raise HTTPException(status_code=422, detail=str(e))

    try:
        result = analyze_fever(symptoms)
        return {"success": True, "analysis": result}
    except Exception as e:
        logger.exception(e)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
