# Portal de Cotizaciones — Sabaki Technologies

Sistema web interno para la creación y gestión de propuestas técnico-comerciales, con generación de PDF profesionales.

---

## Stack

- **Next.js 16** (App Router) — frontend + API Routes
- **SQLite + Prisma 7 + libsql** — base de datos local (migrable a PostgreSQL)
- **NextAuth.js v5** — autenticación con JWT
- **@react-pdf/renderer** — generación de PDF
- **Tailwind CSS** — estilos

---

## Requisitos

- Node.js 20+

---

## Instalación y primer arranque

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
copy .env.example .env
# Editar .env si es necesario (por defecto funciona sin cambios en desarrollo)

# 3. Crear base de datos + datos iniciales
npm run setup
```

Luego iniciar:

```bash
npm run dev
```

Abrir en el navegador: **http://localhost:4000**

---

## Credenciales iniciales

| Campo | Valor |
|-------|-------|
| Email | admin@sabaki.com |
| Contraseña | admin123 |

---

## Variables de entorno (.env)

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `DATABASE_URL` | Ruta a la base SQLite | `file:./dev.db` |
| `NEXTAUTH_SECRET` | Clave secreta para JWT | cambiar en producción |
| `NEXTAUTH_URL` | URL base de la app | `http://localhost:4000` |

---

## Scripts

```bash
npm run dev         # Servidor de desarrollo (puerto 3000)
npm run build       # Build de producción
npm run start       # Servidor de producción (tras build)
npm run setup       # Primera instalación: migrate + seed
npm run db:seed     # Recargar datos de ejemplo
npm run db:reset    # Reiniciar base de datos + seed
```

---

## Estructura de carpetas

```
sabaki-portal/
├── app/
│   ├── (dashboard)/          # Rutas protegidas con sidebar
│   │   ├── cotizaciones/     # Lista, Nueva, Editar
│   │   ├── productos/        # CRUD de catálogo
│   │   ├── ajustes/          # Config de empresa
│   │   └── usuarios/         # Gestión de usuarios (solo admin)
│   ├── api/                  # API Routes
│   │   ├── auth/             # NextAuth handlers
│   │   ├── cotizaciones/     # CRUD + PDF + duplicar
│   │   ├── productos/        # CRUD
│   │   ├── ajustes/          # Config empresa
│   │   ├── usuarios/         # CRUD usuarios
│   │   └── upload/           # Upload de logo
│   └── login/                # Página de login
├── components/
│   ├── layout/Sidebar.tsx    # Navegación lateral
│   └── pdf/CotizacionPDF.tsx # Template PDF
├── lib/
│   ├── auth.ts               # Configuración NextAuth
│   ├── prisma.ts             # Cliente Prisma
│   └── utils.ts              # Helpers
├── prisma/
│   ├── schema.prisma         # Modelos
│   ├── seed.ts               # Datos iniciales
│   └── migrations/           # Historial
├── public/uploads/           # Logos subidos
├── proxy.ts                  # Auth middleware (Edge)
├── .env                      # Variables de entorno
└── .env.example              # Plantilla
```

---

## Funcionalidades

### Cotizaciones
- Crear, editar, duplicar y eliminar propuestas
- Tabla One-Time Fee + Tabla Monthly Fee separadas
- Ítems del catálogo o manuales
- Margen de ganancia (%), IVA (%) y tasas adicionales configurables
- Conversión de moneda USD → EUR/ARS con tipo de cambio manual
- Estados: Borrador / Enviada / Aprobada / Rechazada
- **Generación de PDF** con número de propuesta, tablas con totales, condiciones comerciales y footer en todas las páginas

### Catálogo de Productos
- CRUD con categorías: Hardware / Software / Servicio / Recurrente
- Activar/desactivar ítems sin borrarlos

### Configuración de Empresa
- Datos del proveedor para el encabezado del PDF
- Upload de logo (almacenado en `/public/uploads`)
- Colores corporativos configurables (primario + secundario)
- Notas/condiciones por defecto pre-cargables en cada cotización nueva

### Usuarios (solo Admin)
- Crear usuarios con email y contraseña
- Activar/desactivar cuentas
- Asignar rol: usuario o admin

---

## Migrar a producción con PostgreSQL

1. Cambiar `DATABASE_URL` en `.env`:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/sabaki_portal"
   ```

2. Cambiar provider en `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Instalar adapter de postgres y ejecutar:
   ```bash
   npm install @prisma/adapter-pg pg
   npx prisma migrate deploy
   ```

4. Cambiar `PrismaLibSql` por `PrismaPg` en `lib/prisma.ts`.
