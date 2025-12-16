"""
Schemas de Usuario y Autenticación.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole, SubscriptionTier


# --- Token ---
class Token(BaseModel):
    """Token de acceso JWT."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """Datos decodificados del token."""
    user_id: int
    email: str
    role: str  # String para evitar problemas de validación con enum
    despacho_id: Optional[int] = None


# --- Despacho ---
class DespachoBase(BaseModel):
    """Campos base del despacho."""
    nombre: str = Field(..., min_length=2, max_length=200)
    cif: Optional[str] = Field(None, max_length=20)
    direccion: Optional[str] = None
    telefono: Optional[str] = Field(None, max_length=20)
    email_contacto: EmailStr


class DespachoCreate(DespachoBase):
    """Schema para crear despacho."""
    pass


class DespachoResponse(DespachoBase):
    """Respuesta con datos del despacho."""
    id: int
    subscription_tier: SubscriptionTier
    consultas_mes: int
    consultas_limite: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Usuario ---
class UserBase(BaseModel):
    """Campos base del usuario."""
    email: EmailStr
    nombre: str = Field(..., min_length=2, max_length=100)
    apellidos: str = Field(..., min_length=2, max_length=150)
    numero_colegiado: Optional[str] = None
    colegio_abogados: Optional[str] = None


class UserCreate(UserBase):
    """Schema para registrar usuario."""
    password: str = Field(..., min_length=8)
    despacho_id: Optional[int] = None


class UserLogin(BaseModel):
    """Schema para login."""
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    """Schema para actualizar usuario."""
    nombre: Optional[str] = None
    apellidos: Optional[str] = None
    numero_colegiado: Optional[str] = None
    colegio_abogados: Optional[str] = None


class UserResponse(UserBase):
    """Respuesta con datos del usuario."""
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    despacho_id: Optional[int]
    created_at: datetime
    last_login: Optional[datetime]

    class Config:
        from_attributes = True


class UserWithDespacho(UserResponse):
    """Usuario con información del despacho."""
    despacho: Optional[DespachoResponse] = None
