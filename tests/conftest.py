"""
Global Pytest Configuration and Test Fixtures for Pramaan.
Provides mock database storage, test client fixtures, and synthetic media paths.
"""
import os
import pytest
import pytest_asyncio
from typing import Dict, Any, List
from fastapi.testclient import TestClient
import httpx

from server import app
from src.auth import create_access_token
from src.core.config import settings

# Path to synthetic test fixtures
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
IMAGE_FIXTURES = os.path.join(FIXTURES_DIR, "images")
AUDIO_FIXTURES = os.path.join(FIXTURES_DIR, "audio")

@pytest.fixture
def test_fixtures():
    return {
        "images": {
            "clear": os.path.join(IMAGE_FIXTURES, "clear_face.jpg"),
            "no_face": os.path.join(IMAGE_FIXTURES, "no_face.jpg"),
            "blurred": os.path.join(IMAGE_FIXTURES, "blurred_face.jpg"),
            "low_light": os.path.join(IMAGE_FIXTURES, "low_light.jpg"),
        },
        "audio": {
            "clean": os.path.join(AUDIO_FIXTURES, "clean_speech.wav"),
            "silent": os.path.join(AUDIO_FIXTURES, "silent.wav"),
            "too_short": os.path.join(AUDIO_FIXTURES, "too_short.wav"),
            "noisy": os.path.join(AUDIO_FIXTURES, "noisy.wav"),
        }
    }

@pytest.fixture
def client():
    """Synchronous test client for FastAPI endpoints."""
    with TestClient(app) as c:
        yield c

@pytest_asyncio.fixture
async def async_client():
    """Asynchronous httpx test client for FastAPI endpoints."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

@pytest.fixture
def teacher_auth_headers():
    """Generates valid JWT bearer header for teacher role."""
    token = create_access_token(
        data={"user_id": 999, "role": "teacher", "email": "test_faculty@pramaan.edu", "name": "Prof. Alan Turing"}
    )
    return {"Cookie": f"access_token={token}", "Authorization": f"Bearer {token}"}

@pytest.fixture
def student_auth_headers():
    """Generates valid JWT bearer header for student role."""
    token = create_access_token(
        data={"user_id": 101, "role": "student", "roll_number": "22TEST01", "name": "Ada Lovelace"}
    )
    return {"Cookie": f"access_token={token}", "Authorization": f"Bearer {token}"}

class MockSupabaseTable:
    def __init__(self, table_name: str, data_store: Dict[str, List[Dict[str, Any]]]):
        self.table_name = table_name
        self.store = data_store
        self.query_filters = []
        self._select_cols = "*"

    def select(self, cols="*"):
        self._select_cols = cols
        return self

    def insert(self, rows):
        if isinstance(rows, dict):
            rows = [rows]
        table = self.store.setdefault(self.table_name, [])
        inserted = []
        for r in rows:
            entry = r.copy()
            if "id" not in entry:
                entry["id"] = len(table) + 1
            table.append(entry)
            inserted.append(entry)
        
        class MockResponse:
            def __init__(self, data):
                self.data = data
        return MockExecute(MockResponse(inserted))

    def update(self, values: dict):
        self._update_values = values
        return self

    def eq(self, column: str, value: Any):
        self.query_filters.append((column, value))
        return self

    def order(self, column: str, desc: bool = False):
        return self

    def range(self, start: int, end: int):
        return self

    def execute(self):
        table = self.store.get(self.table_name, [])
        filtered = []
        for item in table:
            matches = True
            for col, val in self.query_filters:
                if item.get(col) != val:
                    matches = False
                    break
            if matches:
                filtered.append(item)

        class MockResponse:
            def __init__(self, data):
                self.data = data
        return MockResponse(filtered)

class MockExecute:
    def __init__(self, response):
        self.response = response
    def execute(self):
        return self.response

@pytest.fixture
def mock_db_store():
    """In-memory isolated DB store for testing."""
    return {
        "teachers": [
            {"teacher_id": 999, "name": "Prof. Alan Turing", "email": "test_faculty@pramaan.edu", "password_hash": "$2b$12$e..."}
        ],
        "students": [
            {"student_id": 101, "name": "Ada Lovelace", "roll_number": "22TEST01", "pin": "$2b$12$...", "face_embedding": [0.05]*128}
        ],
        "subjects": [
            {"subject_id": 501, "teachers_id": 999, "name": "Computer Architecture", "subject_code": "CS301", "section": "A"}
        ],
        "subject_students": [
            {"id": 1, "subject_id": 501, "student_id": 101}
        ],
        "attendance_logs": [
            {"id": 1, "subject_id": 501, "student_id": 101, "is_present": True, "trust_score": 95, "timestamp": "2026-11-01T10:00:00Z"}
        ]
    }

