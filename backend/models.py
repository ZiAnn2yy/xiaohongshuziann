from pydantic import BaseModel, Field


class AnalysisRequest(BaseModel):
    sourceText: str = Field(min_length=1, max_length=5000)


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
