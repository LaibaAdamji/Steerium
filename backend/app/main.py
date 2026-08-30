from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import health, profile, goals, opportunities, applications, dashboard

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wire routers — order matters for OpenAPI docs grouping
app.include_router(health.router)
app.include_router(profile.router)
app.include_router(goals.router)
app.include_router(opportunities.router)
app.include_router(applications.router)
app.include_router(dashboard.router)


@app.get("/")
def root():
    return {"message": f"{settings.APP_NAME} is running"}
