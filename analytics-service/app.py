from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Analytics Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ReportRequest(BaseModel):
    user_id: str
    timeframe: str = "weekly"

@app.post("/generate-report")
async def generate_report(request: ReportRequest):
    # Stub implementation
    return {
        "user_id": request.user_id,
        "timeframe": request.timeframe,
        "insights": [
            "Mood has been stable over the past week.",
            "Sleep tracking shows an average of 7 hours."
        ],
        "trends": {
            "mood_average": 7.5,
            "habit_completion_rate": 0.8
        }
    }

@app.get("/health")
async def health():
    return {"status": "ok", "service": "Analytics Service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5009)
