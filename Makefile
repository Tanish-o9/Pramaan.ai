.PHONY: test test-unit test-api test-cov test-frontend test-e2e lint

test:
	python -m pytest tests/

test-unit:
	python -m pytest tests/test_bunk_calculator.py tests/test_trust_score.py tests/test_face_pipeline.py tests/test_voice_pipeline.py tests/test_session_token.py tests/test_csv_export.py

test-api:
	python -m pytest tests/test_api_integration.py

test-cov:
	python -m pytest --cov=src --cov-report=term-missing tests/

test-frontend:
	npm --prefix frontend test

test-e2e:
	npm --prefix frontend run test:e2e

lint:
	ruff check src/ tests/

