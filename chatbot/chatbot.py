# -*- coding: utf-8 -*-
import json
import random
import difflib
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# Load data once
with open("rmp/all_prof_comments.json") as f:
    prof_comments = json.load(f)

with open("rmp/all_reviews.json") as f:
    all_reviews = json.load(f)

# Build an index by professor name
prof_map = {p["prof_name"].lower(): p for p in prof_comments}

# Initialize VADER sentiment analyzer
analyzer = SentimentIntensityAnalyzer()

# ---------- Helper functions ----------

def find_prof_match(name):
    """Try to find the best match for a professor name (fuzzy + partial matching)."""
    name = name.lower().strip()
    if name in prof_map:
        return name
    # Try partial matches
    for prof in prof_map:
        if name in prof:
            return prof
    # Try fuzzy matching
    matches = difflib.get_close_matches(name, prof_map.keys(), n=1, cutoff=0.6)
    return matches[0] if matches else None

def get_professor_response(name):
    """Return a random comment and summary info for a professor."""
    match = find_prof_match(name)
    if not match:
        return f"Sorry, I don't have any data on Professor {name}."

    prof = prof_map[match]
    comments = prof["comments"]
    sample = random.choice(comments)
    return (
        f"Here's something students said about {prof['prof_name']}:\n\n"
        f'"{sample}"\n\n'
        f"Would you like to see ratings or sentiment next?"
    )


def get_professor_stats(name):
    """Compute average ratings for a professor."""
    match = find_prof_match(name)
    if not match:
        return f"Sorry, I don't have any data on Professor {name}."

    reviews = [r for r in all_reviews if r["prof_name"].lower() == match]
    if not reviews:
        return f"No reviews found for {name}."

    avg_quality = sum(float(r["Quality"]) for r in reviews) / len(reviews)
    avg_difficulty = sum(float(r["Difficulty"]) for r in reviews) / len(reviews)
    courses = list(set(r["Course"] for r in reviews))

    return (
        f"Professor {reviews[0]['prof_name']} has an average quality of {avg_quality:.2f} "
        f"and difficulty of {avg_difficulty:.2f}. "
        f"Courses taught: {', '.join(courses)}."
    )

def list_professors():
    """Return a list of all professor names."""
    return [p['prof_name'] for p in prof_comments]


# ---------- Sentiment analysis ----------

def get_sentiment_summary_for_prof(name):
    match = find_prof_match(name)
    if not match:
        return f"Sorry, I don't have any data on Professor {name}."

    prof = prof_map[match]
    comments = prof["comments"]

    scores = [analyzer.polarity_scores(c)["compound"] for c in comments]
    avg_score = sum(scores) / len(scores)

    if avg_score > 0.2:
        tone = "positive"
    elif avg_score < -0.2:
        tone = "negative"
    else:
        tone = "neutral"

    return (
        f"Overall, the sentiment toward {prof['prof_name']} is **{tone}**, "
        f"based on {len(comments)} student comments."
    )


def get_sentiment_summary_for_course(course_code):
    course_code = course_code.upper()
    reviews = [r for r in all_reviews if r["Course"].upper() == course_code]
    if not reviews:
        return f"No sentiment data found for {course_code}."

    scores = [analyzer.polarity_scores(r["Comment"])["compound"] for r in reviews]
    avg_score = sum(scores) / len(scores)

    if avg_score > 0.2:
        tone = "positive"
    elif avg_score < -0.2:
        tone = "negative"
    else:
        tone = "neutral"

    return f"Students overall feel **{tone}** about {course_code}."
