"""
Logic layer — pure computation on data returned from db.py.
Functions return structured dicts (not strings) so the AI layer can format them.
"""

import difflib
import random
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from db import (
    get_all_professors,
    get_professor_by_name,
    get_reviews_by_prof,
    get_reviews_by_course,
    get_reviews_by_prof_and_course,
)

_analyzer = SentimentIntensityAnalyzer()


# ---------- name matching ----------

def find_professor(name: str) -> dict | None:
    """
    Find a professor by fuzzy name match.
    First tries Supabase ilike, then falls back to client-side fuzzy match
    against the full list if the exact substring isn't found.
    """
    prof = get_professor_by_name(name)
    if prof:
        return prof

    # Fuzzy fallback: pull all names and difflib-match locally
    all_profs = get_all_professors()
    name_map = {p["name"].lower(): p for p in all_profs}
    matches = difflib.get_close_matches(name.lower(), name_map.keys(), n=1, cutoff=0.6)
    if matches:
        return name_map[matches[0]]
    return None


# ---------- analytics functions ----------

def professor_sample_review(prof_name: str) -> dict:
    """Return a random student review for a professor."""
    prof = find_professor(prof_name)
    if not prof:
        return {"error": f"No professor found matching '{prof_name}'."}

    reviews = get_reviews_by_prof(prof["id"])
    if not reviews:
        return {"error": f"No reviews found for {prof['name']}."}

    sample = random.choice(reviews)
    return {
        "prof_name": prof["name"],
        "course": sample.get("course", "unknown"),
        "comment": sample.get("comment", ""),
        "quality": sample.get("quality"),
        "difficulty": sample.get("difficulty"),
    }


def professor_stats(prof_name: str) -> dict:
    """Return average quality, difficulty, and courses for a professor."""
    prof = find_professor(prof_name)
    if not prof:
        return {"error": f"No professor found matching '{prof_name}'."}

    reviews = get_reviews_by_prof(prof["id"])
    if not reviews:
        return {"error": f"No reviews found for {prof['name']}."}

    avg_quality = sum(float(r["quality"]) for r in reviews) / len(reviews)
    avg_difficulty = sum(float(r["difficulty"]) for r in reviews) / len(reviews)
    courses = sorted(set(r["course"] for r in reviews if r.get("course")))

    return {
        "prof_name": prof["name"],
        "review_count": len(reviews),
        "avg_quality": round(avg_quality, 2),
        "avg_difficulty": round(avg_difficulty, 2),
        "courses": courses,
    }


def professor_sentiment(prof_name: str) -> dict:
    """Return overall sentiment tone for a professor based on all comments."""
    prof = find_professor(prof_name)
    if not prof:
        return {"error": f"No professor found matching '{prof_name}'."}

    reviews = get_reviews_by_prof(prof["id"])
    comments = [r["comment"] for r in reviews if r.get("comment")]
    if not comments:
        return {"error": f"No comments found for {prof['name']}."}

    scores = [_analyzer.polarity_scores(c)["compound"] for c in comments]
    avg = sum(scores) / len(scores)
    tone = "positive" if avg > 0.2 else "negative" if avg < -0.2 else "neutral"

    return {
        "prof_name": prof["name"],
        "tone": tone,
        "avg_score": round(avg, 3),
        "comment_count": len(comments),
    }


def course_sentiment(course_code: str) -> dict:
    """Return overall sentiment tone for a course based on all reviews."""
    reviews = get_reviews_by_course(course_code.upper())
    comments = [r["comment"] for r in reviews if r.get("comment")]
    if not comments:
        return {"error": f"No reviews found for course '{course_code}'."}

    scores = [_analyzer.polarity_scores(c)["compound"] for c in comments]
    avg = sum(scores) / len(scores)
    tone = "positive" if avg > 0.2 else "negative" if avg < -0.2 else "neutral"

    return {
        "course": course_code.upper(),
        "tone": tone,
        "avg_score": round(avg, 3),
        "review_count": len(comments),
    }


def compare_professors(prof_name_a: str, prof_name_b: str) -> dict:
    """Compare two professors side-by-side on quality and difficulty."""
    stats_a = professor_stats(prof_name_a)
    stats_b = professor_stats(prof_name_b)

    if "error" in stats_a:
        return stats_a
    if "error" in stats_b:
        return stats_b

    return {"comparison": [stats_a, stats_b]}


def best_professor_for_course(course_code: str) -> dict:
    """Return the highest-rated professor for a given course."""
    reviews = get_reviews_by_course(course_code.upper())
    if not reviews:
        return {"error": f"No reviews found for '{course_code}'."}

    # Group by prof_id, compute average quality per prof
    from collections import defaultdict
    quality_by_prof: dict[int, list[float]] = defaultdict(list)
    name_by_prof: dict[int, str] = {}

    for r in reviews:
        pid = r["prof_id"]
        quality_by_prof[pid].append(float(r["quality"]))
        name_by_prof[pid] = r.get("prof_name", str(pid))

    ranked = sorted(
        quality_by_prof.items(),
        key=lambda x: sum(x[1]) / len(x[1]),
        reverse=True,
    )

    results = [
        {
            "prof_name": name_by_prof[pid],
            "avg_quality": round(sum(scores) / len(scores), 2),
            "review_count": len(scores),
        }
        for pid, scores in ranked
    ]

    return {"course": course_code.upper(), "ranking": results}
