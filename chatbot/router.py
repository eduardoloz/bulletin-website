"""
Router — maps the intent dict from ai.extract_intent to the right analytics function.
Returns a raw data dict that ai.format_response will turn into natural language.
"""

from analytics import (
    professor_sample_review,
    professor_stats,
    professor_sentiment,
    course_sentiment,
    compare_professors,
    best_professor_for_course,
)
from db import get_all_professors


def route(intent: dict) -> dict:
    """
    Dispatch to the correct analytics function based on the intent string.
    Returns a data dict (may contain an "error" key if something went wrong).
    """
    action = intent.get("intent", "unknown")
    prof = (intent.get("professor") or "").strip()
    course = (intent.get("course") or "").strip()

    if action == "professor_review":
        if not prof:
            return {"error": "I need a professor name to find a review. Who are you asking about?"}
        return professor_sample_review(prof)

    if action == "professor_stats":
        if not prof:
            return {"error": "Which professor's stats would you like to see?"}
        return professor_stats(prof)

    if action == "professor_sentiment":
        if not prof:
            return {"error": "Which professor's sentiment would you like to know?"}
        return professor_sentiment(prof)

    if action == "course_sentiment":
        if not course:
            return {"error": "Which course code are you asking about? (e.g. CSE215)"}
        return course_sentiment(course)

    if action == "compare_professors":
        names = [n.strip() for n in prof.split(",") if n.strip()]
        if len(names) < 2:
            return {"error": "Please name two professors to compare."}
        return compare_professors(names[0], names[1])

    if action == "best_for_course":
        if not course:
            return {"error": "Which course are you asking about? (e.g. CSE215)"}
        return best_professor_for_course(course)

    if action == "list_professors":
        profs = get_all_professors()
        names = [p["name"] for p in profs]
        return {"professors": names}

    # unknown or anything else
    return {
        "error": (
            "I'm not sure what you're asking. Try questions like:\n"
            "- 'Tell me about Professor Kane'\n"
            "- 'What are the ratings for Hoblos?'\n"
            "- 'What's the sentiment for CSE215?'\n"
            "- 'Who is easier, Kane or Hoblos?'"
        )
    }
