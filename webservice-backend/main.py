import uvicorn
from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from api import users, bots

# Run application with
# uvicorn main:app --reload
# runs on http://localhost:8000

app = FastAPI()

# Configure CORS
origins = [
    "http://localhost:3000" # also put the link to the webpage here
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Active"}

app.include_router(users.router, tags=["users"])
app.include_router(bots.router, tags=["bots"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
