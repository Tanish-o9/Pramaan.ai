import pytest
from src.services.bunk_calculator import calculate_bunk_metrics

def test_zero_classes_conducted():
    res = calculate_bunk_metrics(0, 0)
    assert res["percentage"] == 100.0
    assert res["bunks_available"] == 0
    assert res["classes_needed"] == 0
    assert res["status"] == "safe"
    assert "No classes held" in res["message"]

def test_perfect_attendance():
    # 10 held, 10 attended -> 100%, can bunk: floor(10/0.75) - 10 = 13 - 10 = 3 classes
    res = calculate_bunk_metrics(10, 10)
    assert res["percentage"] == 100.0
    assert res["bunks_available"] == 3
    assert res["classes_needed"] == 0
    assert res["status"] == "safe"

def test_exact_75_percent_threshold():
    # 20 held, 15 attended -> 75.0%, can bunk: 0
    res = calculate_bunk_metrics(20, 15)
    assert res["percentage"] == 75.0
    assert res["bunks_available"] == 0
    assert res["classes_needed"] == 0
    assert res["status"] == "safe"

def test_shortage_recovery_needed():
    # 10 held, 6 attended -> 60.0%, needed: ceil((0.75*10 - 6)/0.25) = ceil(1.5 / 0.25) = 6
    res = calculate_bunk_metrics(10, 6)
    assert res["percentage"] == 60.0
    assert res["bunks_available"] == 0
    assert res["classes_needed"] == 6
    assert res["status"] == "critical"

    # Verify recovery: after attending 6 consecutive classes
    recovered = calculate_bunk_metrics(10 + 6, 6 + 6)
    assert recovered["percentage"] >= 75.0

def test_zero_attended():
    # 4 held, 0 attended -> 0.0%, needed: ceil(3 / 0.25) = 12
    res = calculate_bunk_metrics(4, 0)
    assert res["percentage"] == 0.0
    assert res["classes_needed"] == 12
    recovered = calculate_bunk_metrics(4 + 12, 0 + 12)
    assert recovered["percentage"] >= 75.0

def test_large_numbers():
    # 10,000 classes, 8,000 attended -> 80.0%
    res = calculate_bunk_metrics(10000, 8000)
    assert res["percentage"] == 80.0
    # floor(8000 / 0.75) - 10000 = 10666 - 10000 = 666 bunks
    assert res["bunks_available"] == 666
    assert res["classes_needed"] == 0

def test_rounding_boundaries():
    # 3 classes held, 2 attended -> 66.666...% -> rounds to 66.7%
    res = calculate_bunk_metrics(3, 2)
    assert res["percentage"] == 66.7
    assert res["status"] == "warning"

def test_custom_threshold():
    # 10 held, 8 attended -> 80.0%. At 85% threshold, student is short
    res = calculate_bunk_metrics(10, 8, threshold_pct=85.0)
    assert res["percentage"] == 80.0
    assert res["classes_needed"] > 0
    assert res["bunks_available"] == 0

def test_negative_counts_raise_value_error():
    with pytest.raises(ValueError) as exc:
        calculate_bunk_metrics(-1, 0)
    assert "cannot be negative" in str(exc.value)

def test_attended_exceeding_total_raises_value_error():
    with pytest.raises(ValueError) as exc:
        calculate_bunk_metrics(5, 6)
    assert "cannot exceed total" in str(exc.value)
