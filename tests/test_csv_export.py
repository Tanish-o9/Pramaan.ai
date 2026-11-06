import pytest
import csv
import io
from src.utils.csv_export import format_attendance_csv

def test_csv_export_header_and_basic_row():
    records = [{
        "timestamp": "2026-11-06T10:30:00Z",
        "students": {"roll_number": "22CS042", "name": "Rahul Sharma"},
        "is_present": True,
        "trust_score": 96,
        "verification_status": "auto_accepted"
    }]
    csv_str = format_attendance_csv(records)
    reader = list(csv.reader(io.StringIO(csv_str)))
    assert len(reader) == 2  # Header + 1 record
    assert reader[0] == ["Date", "Time", "Roll Number", "Student Name", "Status", "Trust Score", "Verification Method"]
    assert reader[1] == ["2026-11-06", "10:30:00", "22CS042", "Rahul Sharma", "Present", "96%", "auto_accepted"]

def test_csv_escaping_commas_and_quotes():
    records = [{
        "timestamp": "2026-11-06T09:15:00Z",
        "students": {"roll_number": "22CS099", "name": 'Doe, John "The Rock"'},
        "is_present": False,
        "trust_score": 0,
        "verification_status": "absent"
    }]
    csv_str = format_attendance_csv(records)
    reader = list(csv.reader(io.StringIO(csv_str)))
    assert len(reader) == 2
    # Verify the CSV parser correctly unescapes quotes and handles comma inside field
    assert reader[1][3] == 'Doe, John "The Rock"'
    assert reader[1][4] == "Absent"

def test_csv_unicode_preservation():
    records = [
        {
            "timestamp": "2026-11-06T11:00:00Z",
            "students": {"roll_number": "22CS101", "name": "राहुल कुमार"},
            "is_present": True,
            "trust_score": 92,
            "verification_status": "auto_accepted"
        },
        {
            "timestamp": "2026-11-06T11:00:00Z",
            "students": {"roll_number": "22CS102", "name": "Amélie Nothomb"},
            "is_present": True,
            "trust_score": 88,
            "verification_status": "auto_accepted"
        }
    ]
    csv_str = format_attendance_csv(records)
    reader = list(csv.reader(io.StringIO(csv_str)))
    assert len(reader) == 3
    assert reader[1][3] == "राहुल कुमार"
    assert reader[2][3] == "Amélie Nothomb"

def test_csv_empty_records():
    csv_str = format_attendance_csv([])
    reader = list(csv.reader(io.StringIO(csv_str)))
    assert len(reader) == 1  # Only header

