
# 🚀 DevTools Platform - GlobalGoods Up

Plataforma profesional de herramientas para desarrolladores con IA integrada.

## ✨ Características Principales

### 🎨 **AI Website Generator** (Nuevo)
- Wizard guiado de 4 pasos
- Sistema de subida de imágenes a S3
- 6 estilos visuales únicos
- Generación de diseños creativos con IA
- Preview en tiempo real
- Publicación temporal gratuita (7 días)

### 🔧 **17 Herramientas Profesionales**
1. AI Website Generator
2. Workflow Code Generator
3. JSON Formatter (con IA)
4. API Tester
5. Regex Tester
6. Diff Checker (con análisis semántico IA)
7. JWT Decoder (con análisis de seguridad IA)
8. SQL Formatter (con optimización IA)
9. Base64 Encoder/Decoder
10. Hash Generator
11. Color Picker
12. QR Generator
13. Markdown Editor
14. Timestamp Converter
15. URL Encoder/Decoder
16. UUID Generator
17. Cron Generator

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS
- **UI Components**: Shadcn/ui + Radix UI
- **Autenticación**: NextAuth.js
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Almacenamiento**: AWS S3
- **IA**: Abacus.AI (GPT-4.1-mini)
- **Pagos**: Stripe
- **Despliegue**: Vercel / Custom

## 📦 Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/devtools-platform.git
cd devtools-platform/nextjs_space

# Instalar dependencias
yarn install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tus credenciales

# Ejecutar migraciones de base de datos
yarn prisma generate
yarn prisma db push

# Iniciar servidor de desarrollo
yarn dev
```

## 🔐 Variables de Entorno Requeridas

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key"

# AWS S3
AWS_BUCKET_NAME="tu-bucket"
AWS_FOLDER_PREFIX="devtools/"

# Abacus AI
ABACUSAI_API_KEY="tu-api-key"

# Stripe (opcional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## 🚀 Scripts Disponibles

```bash
# Desarrollo
yarn dev

# Build de producción
yarn build

# Iniciar producción
yarn start

# Linting
yarn lint

# Base de datos
yarn prisma generate
yarn prisma db push
yarn prisma studio
```

## 📁 Estructura del Proyecto

```
nextjs_space/
├── app/
│   ├── (auth)/          # Páginas de autenticación
│   ├── api/             # API routes
│   ├── dashboard/       # Panel de usuario
│   ├── tools/           # Herramientas individuales
│   ├── pricing/         # Planes de pago
│   └── layout.tsx       # Layout principal
├── components/
│   ├── ui/              # Componentes UI (Shadcn)
│   └── ...              # Componentes personalizados
├── lib/
│   ├── auth.ts          # Configuración NextAuth
│   ├── db.ts            # Cliente Prisma
│   ├── stripe.ts        # Configuración Stripe
│   └── utils.ts         # Utilidades
├── prisma/
│   └── schema.prisma    # Esquema de base de datos
└── public/              # Archivos estáticos
```

## 🎯 Roadmap

### SPRINT 1 ✅ (Completado)
- [x] Wizard guiado de 4 pasos
- [x] Sistema de subida de imágenes
- [x] Prompts de IA mejorados
- [x] 6 estilos visuales únicos

### SPRINT 2 🚧 (Próximo)
- [ ] Sitemap XML dinámico
- [ ] Meta tags optimizados por herramienta
- [ ] Schema Markup (SEO)
- [ ] Biblioteca de templates pre-diseñados

### SPRINT 3 📅 (Futuro)
- [ ] Blog integrado
- [ ] Programa de referidos
- [ ] Multi-idioma
- [ ] API pública

## 📝 Licencia

Propietario - © 2025 GlobalGoods Up

## 🤝 Contribuir

Este es un proyecto privado. Para consultas, contacta con el equipo.

## 📧 Contacto

- Website: https://devtoolsplatform.abacusai.app
- Email: contact@globalgoods.up

---

**Powered by GlobalGoods Up** 🚀
