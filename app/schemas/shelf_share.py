from pydantic import BaseModel, EmailStr
from enum import Enum

class ShelfRole(str, Enum):
    editor = "editor"
    viewer = "viewer"

class ShelfShareCreate(BaseModel):
    email: EmailStr
    role: ShelfRole

class ShelfShareRoleUpdate(BaseModel):
    role: ShelfRole

class ShelfShareOut(BaseModel):
    id: int
    shelf_id: int
    user_id: int
    role: str

    class Config:
        from_attributes = True

class SharedShelfOut(BaseModel):
    id: int
    name: str
    owner_id: int
    role: str
