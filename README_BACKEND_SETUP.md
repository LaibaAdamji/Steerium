# Backend setup (Phase 0)

cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example .env     # fill in DATABASE_URL at minimum
uvicorn app.main:app --reload

# Verify
curl http://localhost:8000/api/health

# Run tests
pytest
