"""
AI layer — two responsibilities:
  1. extract_intent: turns raw user message → structured intent dict
  2. format_response: turns structured data dict → friendly natural language
"""

import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

_client = Groq(api_key=os.environ["GROQ_API_KEY"])
MODEL = "llama-3.3-70b-versatile"

# ------------------------------------------------------------------ #
# Intent extraction
# ------------------------------------------------------------------ #

_INTENT_SYSTEM_PROMPT = """
You are an intent classifier for a professor review chatbot at Stony Brook University.

Given a user message, return ONLY valid JSON with these fields:
{
  "intent": "<one of the intents listed below>",
  "professor": "<professor name or null>",
  "course": "<course code like CSE215 or null>"
}

Valid intents:
- "professor_review"    → user wants a sample student review/comment about a professor
- "professor_stats"     → user wants numerical ratings (quality, difficulty, courses)
- "professor_sentiment" → user wants the overall sentiment/vibe toward a professor
- "course_sentiment"    → user wants the overall sentiment toward a course
- "compare_professors"  → user wants to compare two professors (put both names comma-separated in "professor")
- "best_for_course"     → user wants to know which professor is best for a course
- "list_professors"     → user wants to know which professors are available
- "unknown"             → anything else

Rules:
- Extract the professor name exactly as the user said it (don't correct spelling)
- Course codes are uppercase letters + digits (e.g. CSE215, AMS161)
- If comparing two professors, put both names separated by a comma in the "professor" field
- Return ONLY the JSON object, no explanation, no markdown fences
""".strip()


def extract_intent(user_message: str) -> dict:
    """
    Call Groq to parse user intent.
    Returns a dict with keys: intent, professor, course.
    Falls back to {"intent": "unknown"} on any error.
    """
    try:
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": _INTENT_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        return json.loads(raw)
    except Exception as e:
        print(f"[ai.extract_intent] error: {e}")
        return {"intent": "unknown", "professor": None, "course": None}


# ------------------------------------------------------------------ #
# Response formatting
# ------------------------------------------------------------------ #

_FORMAT_SYSTEM_PROMPT = """
You are a helpful and friendly assistant for a professor review site at Stony Brook University.

You will receive structured data fetched from a real database. Your job is to turn it into
a clear, concise, natural-language response. Keep it friendly but informative.

Rules:
- Do NOT invent data. Only use what's in the provided data.
- Do NOT say "based on the data" — just answer naturally.
- If the data contains an "error" key, apologize and relay the message.
- Keep responses under 4 sentences unless the user asked for a comparison or list.
""".strip()


def format_response(user_message: str, data: dict) -> str:
    """
    Given the original user message and the structured data from analytics.py,
    produce a natural-language response string.
    """
    try:
        data_str = json.dumps(data, indent=2)
        response = _client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": _FORMAT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"User asked: {user_message}\n\n"
                        f"Data from database:\n{data_str}\n\n"
                        "Write the response:"
                    ),
                },
            ],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[ai.format_response] error: {e}")
        return "Sorry, I had trouble generating a response. Please try again."
