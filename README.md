# academix-backend

API REST de **Academix**, la plataforma educativa. Proyecto **completamente
independiente** de `academix-frontend`: repositorio propio, `package.json`
propio, variables de entorno propias y despliegue propio.

## Propósito

Este backend es responsable de la lógica de negocio, la validación, la
autorización y el acceso seguro a Supabase PostgreSQL. `academix-frontend`
no se conecta directamente a Supabase para autenticación, datos ni reglas
de negocio: todo pasa por esta API.

La infraestructura HTTP y la integración de **Supabase Auth** ya están
conectadas. El backend registra e inicia sesiones, valida JWT en cada ruta
protegida y mantiene las claves de Supabase fuera del frontend.

## Stack

- Node.js (>= 20, probado con Node 22/24)
- Express 4
- TypeScript (`strict: true`)
- Zod (validación de entorno y, en las siguientes fases, solicitudes)
- CORS + Helmet
- Vitest + Supertest (pruebas)

## Requisitos

- Node.js 20 o superior
- npm

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores:

```bash
cp .env.example .env
```

| Variable | Obligatoria | Descripción |
|---|---|---|
| `PORT` | No (default `3000`) | Puerto donde escucha Express. |
| `NODE_ENV` | No (default `development`) | `development` \| `production` \| `test`. |
| `FRONTEND_URL` | **Sí** | Uno o más orígenes HTTP/HTTPS autorizados para CORS, separados por comas. No admite rutas. |
| `SUPABASE_URL` | **Sí** | URL del proyecto `academix` en Supabase. |
| `SUPABASE_PUBLISHABLE_KEY` | **Sí** | Clave publicable moderna para operaciones de Auth. |
| `SUPABASE_SECRET_KEY` | **Sí** | Clave secreta exclusiva del backend para perfiles y roles. |

Todas las variables se leen y validan en un único lugar: `src/config/env.ts`.
Ningún otro archivo accede a `process.env` directamente.

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Levanta el servidor en modo desarrollo con recarga automática (`tsx watch`). |
| `npm run build` | Compila TypeScript a `dist/` (`tsc`). |
| `npm run start` | Ejecuta el build ya compilado (`node dist/server.js`). Requiere `npm run build` antes. |
| `npm run typecheck` | Verifica tipos sin generar archivos. |
| `npm run lint` | Corre ESLint sobre todo el proyecto. |
| `npm run test` | Corre las pruebas con Vitest. **No requiere `.env`**: `vitest.config.ts` inyecta variables de entorno seguras solo para la ejecución de pruebas (ver más abajo). |
| `npm run test:watch` | Mantiene Vitest observando cambios durante el desarrollo. |
| `npm run check` | Ejecuta lint, typecheck, pruebas y build en ese orden. |

## Ejecución en desarrollo

```bash
npm run dev
```

Deberías ver:

```
Backend ejecutándose en:
http://localhost:3000
Entorno: development
```

## Build de producción

```bash
npm run build
npm run start
```

## Pruebas

```bash
npm test
```

Las pruebas de `tests/` (Vitest + Supertest) **no requieren un
`.env` local**. `vitest.config.ts` define `test.env` con valores seguros
de prueba (`NODE_ENV=test`, `PORT=3000`, URL del frontend y credenciales
ficticias de Supabase)
que se inyectan en `process.env` únicamente durante la ejecución de
Vitest, antes de que se cargue `src/config/env.ts`. Esto permite clonar
el repositorio y ejecutar `npm install && npm test` sin ningún paso
manual de configuración.

## Estructura del proyecto

```
academix-backend/
├── src/
│   ├── config/
│   │   ├── cors.ts             # política CORS centralizada
│   │   └── env.ts              # lectura y validación (Zod) de variables de entorno
│   │   └── supabase.ts         # clientes Auth y Admin exclusivos del servidor
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   └── health.controller.ts
│   ├── errors/
│   │   └── app-error.ts        # errores operativos seguros y tipados
│   ├── routes/
│   │   ├── health.routes.ts
│   │   └── index.ts            # registra todos los routers de /api/v1
│   ├── middleware/
│   │   ├── error-handler.ts    # manejador central de errores (JSON, sin stack trace al cliente)
│   │   ├── require-auth.ts      # valida Authorization: Bearer con Supabase Auth
│   │   └── not-found.ts        # 404 en formato JSON consistente
│   ├── services/
│   │   └── auth.service.ts      # registro, login, logout y recuperación
│   ├── types/
│   │   └── api.types.ts        # éxito, error y paginación compartidos
│   ├── utils/
│   │   └── api-response.ts     # constructores del sobre común
│   ├── app.ts                  # crea y configura la app Express (sin arrancarla)
│   └── server.ts               # arranca el servidor HTTP
├── tests/                       # health, CORS, errores, entorno y respuestas
├── .github/workflows/ci.yml     # validación automática en GitHub
├── .env.example
├── package.json
├── tsconfig.json
└── eslint.config.js
```

La capa `services/` contiene únicamente la lógica real de Auth. Los
repositorios del dominio aparecerán al implementar catálogo, perfiles y aula.

## Endpoint disponible

### `GET /api/v1/health`

Público, sin autenticación.

```bash
curl http://localhost:3000/api/v1/health
```

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "environment": "development",
    "uptime": 12.345,
    "timestamp": "2026-07-30T12:00:00.000Z"
  }
}
```

## Autenticación

| Método | Ruta | Protección |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Pública |
| `POST` | `/api/v1/auth/login` | Pública |
| `POST` | `/api/v1/auth/password-reset` | Pública |
| `GET` | `/api/v1/auth/me` | Bearer token |
| `POST` | `/api/v1/auth/logout` | Bearer token |

El registro recibe `{ fullName, email, password }`. Login devuelve el
`AuthSession` esperado por el frontend: `{ user, accessToken, expiresAt }`.
Si la confirmación de correo está activa en Supabase, el registro responde
`403 EMAIL_CONFIRMATION_REQUIRED` hasta que el usuario confirme su cuenta.

Para proteger cualquier router futuro, agrega `requireAuth` antes del
controlador. El middleware valida el token contra Supabase Auth y deja la
identidad verificada en `req.auth`; ningún controlador debe confiar en un ID
de usuario o rol enviado por el navegador.

### Cualquier ruta no existente

```bash
curl http://localhost:3000/api/v1/ruta-que-no-existe
```

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "El recurso solicitado no existe."
  }
}
```

## Formato de respuestas

Toda la API responde con estos formatos:

**Éxito:**
```json
{ "success": true, "data": {} }
```

**Colección paginada:**
```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 12, "total": 0, "totalPages": 1 }
}
```

**Error:**
```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Mensaje seguro.", "fields": {} }
}
```

## Relación con academix-frontend

`academix-frontend` consume esta API mediante `VITE_API_URL` (definida
en su propio `.env`), por ejemplo:

```
VITE_API_URL=http://localhost:3000/api/v1
```

El frontend terminado ya contiene el cliente HTTP y el contrato de
integración. El backend debe conservar `/api/v1`, JSON en `camelCase` y el
sobre común documentado arriba. La especificación completa está en
[`docs/api-contract.md`](docs/api-contract.md).

## Relación con Supabase

Este backend es el único componente autorizado para usar `SUPABASE_SECRET_KEY`.
La migración `setup_auth_profile` crea automáticamente `public.usuarios`,
asigna el rol `Alumno`, habilita RLS y revoca el acceso directo de los roles
`anon` y `authenticated` a las tablas de identidad.

## Fases siguientes

1. **Seguridad de datos:** habilitar RLS o revocar Data API en las tablas del
   dominio que todavía están expuestas.
2. **Perfiles y catálogo:** categorías, cursos e instructores.
3. **Inscripciones, aula y progreso.**
4. **Reseñas y certificados.**
5. **Integración completa con el frontend y despliegue.**
