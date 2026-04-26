"""
Data layer — all Supabase queries live here.
Every other module imports from this file instead of touching the DB directly.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

_client: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)


def get_professor_by_name(name: str) -> dict | None:
    """
    Return the first professor whose name matches (case-insensitive substring).
    Returns None if no match found.
    """
    result = (
        _client.table("professors")
        .select("*")
        .ilike("name", f"%{name}%")
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_all_professors() -> list[dict]:
    """Return all professors (id + name)."""
    result = _client.table("professors").select("id, name").execute()
    return result.data


def get_reviews_by_prof(prof_id: int) -> list[dict]:
    """Return all reviews for a given professor id."""
    result = (
        _client.table("reviews")
        .select("*")
        .eq("prof_id", prof_id)
        .execute()
    )
    return result.data


def get_reviews_by_course(course_code: str) -> list[dict]:
    """Return all reviews for a given course code (e.g. 'CSE215')."""
    result = (
        _client.table("reviews")
        .select("*")
        .ilike("course", course_code)
        .execute()
    )
    return result.data


def get_reviews_by_prof_and_course(prof_id: int, course_code: str) -> list[dict]:
    """Return reviews for a specific professor in a specific course."""
    result = (
        _client.table("reviews")
        .select("*")
        .eq("prof_id", prof_id)
        .ilike("course", course_code)
        .execute()
    )
    return result.data
