"""
Modelos de Usuario y Despacho.
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text, Integer, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, Enum):
    """Roles de usuario en el sistema."""
    ABOGADO = "abogado"
    ADMIN_DESPACHO = "admin_despacho"
    SUPER_ADMIN = "super_admin"


class SubscriptionTier(str, Enum):
    """Niveles de suscripción."""
    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class Despacho(Base):
    """Despacho de abogados - entidad de facturación y licencias."""

    __tablename__ = "despachos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    cif: Mapped[Optional[str]] = mapped_column(String(20), unique=True)
    direccion: Mapped[Optional[str]] = mapped_column(Text)
    telefono: Mapped[Optional[str]] = mapped_column(String(20))
    email_contacto: Mapped[str] = mapped_column(String(255), nullable=False)

    # Suscripción
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        SQLEnum(SubscriptionTier),
        default=SubscriptionTier.FREE
    )
    consultas_mes: Mapped[int] = mapped_column(Integer, default=0)
    consultas_limite: Mapped[int] = mapped_column(Integer, default=10)  # Free tier

    # Fechas
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    subscription_expires: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relaciones
    usuarios: Mapped[List["User"]] = relationship(back_populates="despacho")

    def __repr__(self):
        return f"<Despacho {self.nombre}>"

    def puede_consultar(self) -> bool:
        """Verifica si el despacho puede realizar más consultas."""
        if self.subscription_tier == SubscriptionTier.ENTERPRISE:
            return True
        return self.consultas_mes < self.consultas_limite


class User(Base):
    """Usuario del sistema - abogado o administrador."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Datos personales
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(150), nullable=False)
    numero_colegiado: Mapped[Optional[str]] = mapped_column(String(50))
    colegio_abogados: Mapped[Optional[str]] = mapped_column(String(100))

    # Rol y permisos
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole),
        default=UserRole.ABOGADO
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Despacho
    despacho_id: Mapped[Optional[int]] = mapped_column(ForeignKey("despachos.id"))
    despacho: Mapped[Optional["Despacho"]] = relationship(back_populates="usuarios")

    # Fechas
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime)

    # Relaciones
    casos: Mapped[List["Case"]] = relationship(back_populates="abogado")

    def __repr__(self):
        return f"<User {self.email}>"

    @property
    def nombre_completo(self) -> str:
        """Retorna nombre completo del usuario."""
        return f"{self.nombre} {self.apellidos}"
