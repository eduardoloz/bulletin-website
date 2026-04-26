"""
FastAPI server — single POST /chat endpoint.

Run with:
    uvicorn server:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ai import extract_intent, format_response
from router import route

app = FastAPI(title="Professor Review Chatbot")

# Allow your React frontend (any localhost port during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str
    # Expose intent for debugging — remove in production if you prefer
    debug_intent: dict | None = None


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Step 1: LLM extracts intent
    intent = extract_intent(req.message)

    # Step 2: Route intent → real data
    data = route(intent)

    # Step 3: LLM formats the data into a human response
    response_text = format_response(req.message, data)

    return ChatResponse(response=response_text, debug_intent=intent)


@app.get("/health")
def health():
    return {"status": "ok"}
