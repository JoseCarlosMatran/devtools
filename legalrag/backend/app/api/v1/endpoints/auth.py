"""
Endpoints de autenticación.
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, get_current_active_user
)
from app.core.config import settings
from app.models.user import User, Despacho, UserRole
from app.schemas.user import (
    UserCreate, UserResponse, UserLogin, Token,
    DespachoCreate, DespachoResponse, UserWithDespacho
)

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Registra un nuevo usuario.
    """
    # Verificar email único (case-insensitive)
    result = await db.execute(
        select(User).where(func.lower(User.email) == func.lower(user_data.email))
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )

    # Crear usuario (email en minúsculas para consistencia)
    user = User(
        email=user_data.email.lower(),
        hashed_password=get_password_hash(user_data.password),
        nombre=user_data.nombre,
        apellidos=user_data.apellidos,
        numero_colegiado=user_data.numero_colegiado,
        colegio_abogados=user_data.colegio_abogados,
        despacho_id=user_data.despacho_id,
        role=UserRole.ABOGADO
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Login con email y contraseña.
    Retorna token JWT.
    """
    # Buscar usuario (case-insensitive)
    result = await db.execute(
        select(User).where(func.lower(User.email) == func.lower(form_data.username))
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado"
        )

    # Actualizar último login
    user.last_login = datetime.utcnow()
    await db.commit()

    # Generar token (sub debe ser string según JWT spec)
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
            "despacho_id": user.despacho_id
        }
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60
    )


@router.get("/me", response_model=UserWithDespacho)
async def get_me(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene datos del usuario actual.
    """
    # Cargar despacho si existe
    despacho = None
    if current_user.despacho_id:
        result = await db.execute(
            select(Despacho).where(Despacho.id == current_user.despacho_id)
        )
        despacho = result.scalar_one_or_none()

    return UserWithDespacho(
        id=current_user.id,
        email=current_user.email,
        nombre=current_user.nombre,
        apellidos=current_user.apellidos,
        numero_colegiado=current_user.numero_colegiado,
        colegio_abogados=current_user.colegio_abogados,
        role=current_user.role,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        despacho_id=current_user.despacho_id,
        created_at=current_user.created_at,
        last_login=current_user.last_login,
        despacho=DespachoResponse.model_validate(despacho) if despacho else None
    )


@router.post("/despacho", response_model=DespachoResponse, status_code=status.HTTP_201_CREATED)
async def create_despacho(
    despacho_data: DespachoCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuevo despacho y asigna al usuario como admin.
    """
    # Verificar CIF único si se proporciona
    if despacho_data.cif:
        result = await db.execute(
            select(Despacho).where(Despacho.cif == despacho_data.cif)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El CIF ya está registrado"
            )

    # Crear despacho
    despacho = Despacho(
        nombre=despacho_data.nombre,
        cif=despacho_data.cif,
        direccion=despacho_data.direccion,
        telefono=despacho_data.telefono,
        email_contacto=despacho_data.email_contacto
    )

    db.add(despacho)
    await db.flush()

    # Asignar usuario como admin del despacho
    current_user.despacho_id = despacho.id
    current_user.role = UserRole.ADMIN_DESPACHO

    await db.commit()
    await db.refresh(despacho)

    return despacho


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_active_user)
):
    """
    Refresca el token de acceso.
    """
    access_token = create_access_token(
        data={
            "sub": str(current_user.id),
            "email": current_user.email,
            "role": current_user.role.value,
            "despacho_id": current_user.despacho_id
        }
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.access_token_expire_minutes * 60
    )
