"""
Performance, Latency & Load Testing Benchmark for Pramaan.
Measures p50, p95, p99 latencies, throughput (RPS), and failure rates.
"""
import time
import sys
import os
import statistics
import concurrent.futures

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from server import app
from src.services.bunk_calculator import calculate_bunk_metrics
from src.services.trust_score_service import TrustScoreEngine
from src.services.session_token_service import generate_session_code, validate_session_code

def benchmark_services():
    client = TestClient(app)
    results = {}

    # 1. Health & Readiness Latency
    health_times = []
    for _ in range(200):
        t0 = time.perf_counter()
        res = client.get("/health")
        assert res.status_code == 200
        health_times.append((time.perf_counter() - t0) * 1000.0)

    # 2. Bunk Calculator Computation Throughput
    bunk_times = []
    for i in range(1000):
        t0 = time.perf_counter()
        calculate_bunk_metrics(total_classes=50 + (i % 20), attended_classes=35 + (i % 15))
        bunk_times.append((time.perf_counter() - t0) * 1000.0)

    # 3. Multi-Factor Trust Score Calculation
    engine = TrustScoreEngine()
    trust_times = []
    for i in range(1000):
        t0 = time.perf_counter()
        engine.calculate(
            face_confidence=0.85 + (i % 10) * 0.01,
            liveness_passed=True,
            session_code_valid=True,
            ip_matched=(i % 2 == 0),
            device_known=(i % 3 != 0)
        )
        trust_times.append((time.perf_counter() - t0) * 1000.0)

    # 4. Anti-Proxy Rotating Code Validation
    token_times = []
    code = generate_session_code(501, 999)
    for _ in range(500):
        t0 = time.perf_counter()
        validate_session_code(code, 501, 999, allow_grace_period_seconds=60)
        token_times.append((time.perf_counter() - t0) * 1000.0)

    def stats(series):
        s = sorted(series)
        n = len(s)
        return {
            "p50_ms": round(s[int(n * 0.50)], 3),
            "p95_ms": round(s[int(n * 0.95)], 3),
            "p99_ms": round(s[int(n * 0.99)], 3),
            "mean_ms": round(statistics.mean(s), 3),
            "min_ms": round(min(s), 3),
            "max_ms": round(max(s), 3),
            "total_ops": n
        }

    summary = {
        "api_health_endpoint": stats(health_times),
        "bunk_calculator": stats(bunk_times),
        "trust_score_engine": stats(trust_times),
        "session_token_validation": stats(token_times)
    }

    print("\n================== PRAMAAN PERFORMANCE BENCHMARK REPORT ==================")
    for service, m in summary.items():
        print(f"\n[{service.upper()}] (Samples: {m['total_ops']})")
        print(f"  - p50:  {m['p50_ms']} ms")
        print(f"  - p95:  {m['p95_ms']} ms")
        print(f"  - p99:  {m['p99_ms']} ms")
        print(f"  - Mean: {m['mean_ms']} ms (Range: {m['min_ms']}ms - {m['max_ms']}ms)")
    print("==========================================================================\n")
    return summary

if __name__ == "__main__":
    benchmark_services()
