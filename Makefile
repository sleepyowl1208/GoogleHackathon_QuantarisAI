PY := $(if $(wildcard .venv/bin/python),.venv/bin/python,python3)

dev:
	@trap 'kill 0' INT TERM; $(PY) -m uvicorn apps.api.main:app --port 8000 & (cd apps/web && npm run dev) & wait

api-dev:
	$(PY) -m uvicorn apps.api.main:app --port 8000 --reload

test:
	$(PY) -m unittest discover -s apps/api/tests -t .

api-test: test

samples:
	$(PY) -m apps.api.ops.sample_data

docker-build:
	docker build -t quantaris .

docker-run:
	docker run --rm -p 8080:8080 --env-file .env.local quantaris
