import os

import pytest


def test_evaluation_report_exists_and_meets_quality_gates():
    report_path = "docs/EVALUATION.md"
    assert os.path.exists(report_path), "docs/EVALUATION.md must exist"

    with open(report_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check that ISO standards and core sections exist
    assert "ISO/IEC 19795-1" in content
    assert "Optimal Operating Point" in content
    assert "FAR <= 1.0%" in content
    assert "Attack Success Rate" in content
    assert "PASSED" in content

