# academix-backend

API REST de **Academix**, la plataforma educativa. Proyecto **completamente
independiente** de `academix-frontend`: repositorio propio, `package.json`
propio, variables de entorno propias y despliegue propio.

## Propósito

Este backend es responsable de la lógica de negocio, la validación, la
autorización y el acceso seguro a Supabase PostgreSQL. `academix-frontend`
no se conecta directamente a Supabase para autenticación, datos ni reglas
de negocio: todo pasa por esta API.

La infraestructura HTTP, **Supabase Auth**, perfiles y el catálogo inicial ya
están conectados. El backend registra e inicia sesiones, valida JWT en cada
ruta protegida y mantiene las claves de Supabase fuera del frontend.

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
| `npm run admin:bootstrap -- --email correo` | Asigna una sola vez el primer Administrador a una cuenta ya registrada. |
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
│   │   ├── catalog.controller.ts
│   │   ├── profile.controller.ts
│   │   └── health.controller.ts
│   ├── errors/
│   │   └── app-error.ts        # errores operativos seguros y tipados
│   ├── routes/
│   │   ├── catalog.routes.ts
│   │   ├── health.routes.ts
│   │   ├── profile.routes.ts
│   │   └── index.ts            # registra todos los routers de /api/v1
│   ├── repositories/            # acceso exclusivo del backend a Supabase
│   ├── middleware/
│   │   ├── error-handler.ts    # manejador central de errores (JSON, sin stack trace al cliente)
│   │   ├── require-auth.ts      # valida Authorization: Bearer con Supabase Auth
│   │   └── not-found.ts        # 404 en formato JSON consistente
│   ├── services/                # Auth y reglas de perfil/catálogo
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

La capa `services/` contiene reglas de aplicación y transformación al contrato
del frontend. `repositories/` concentra todas las consultas de datos mediante
el cliente secreto del servidor.

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

## Perfiles y catálogo

| Método | Ruta | Protección |
|---|---|---|
| `GET` | `/api/v1/categories` | Pública vía Express |
| `GET` | `/api/v1/courses` | Pública vía Express |
| `GET` | `/api/v1/courses/:courseId` | Pública vía Express |
| `GET` | `/api/v1/courses/:courseId/related` | Pública vía Express |
| `GET` | `/api/v1/instructors/:instructorId` | Pública vía Express |
| `GET` | `/api/v1/instructors/:instructorId/courses` | Pública vía Express |
| `GET` | `/api/v1/users/me` | Bearer token |
| `PATCH` | `/api/v1/users/me` | Bearer token |

Las rutas públicas significan que el navegador puede llamar a Express sin
sesión; no significan acceso directo a las tablas de Supabase. Solo se muestran
cursos activos y publicados. Hasta que se carguen cursos e instructores reales,
las colecciones correspondientes responden vacías.

## Administración de roles y cursos

Todas las rutas siguientes requieren JWT y rol `admin` obtenido de la base de
datos; el backend nunca acepta el rol enviado por React.

| Método | Ruta |
|---|---|
| `GET` | `/api/v1/admin/users` |
| `PATCH` | `/api/v1/admin/users/:userId/roles` |
| `GET` | `/api/v1/admin/instructors` |
| `PUT` | `/api/v1/admin/instructors/:userId` |
| `POST`, `PATCH` | `/api/v1/admin/categories`, `/api/v1/admin/categories/:categoryId` |
| `GET` | `/api/v1/admin/course-options` |
| `GET`, `POST` | `/api/v1/admin/courses` |
| `PATCH` | `/api/v1/admin/courses/:courseId` |
| `PUT` | `/api/v1/admin/courses/:courseId/instructor` |
| `POST` | `/api/v1/admin/courses/:courseId/publish` |
| `POST` | `/api/v1/admin/courses/:courseId/archive` |

El instructor dispone de `GET /api/v1/instructor/courses`,
`PATCH /api/v1/instructor/courses/:courseId` y
`POST /api/v1/instructor/courses/:courseId/submit`. Solo puede modificar un
borrador que tenga asignado. Publicar y archivar son operaciones de
administrador y los cambios sensibles quedan auditados.

Para crear el primer administrador, registra previamente la cuenta y ejecuta:

```bash
npm run admin:bootstrap -- --email admin@ejemplo.com
```

El comando no crea usuarios ni contraseñas y deja de funcionar en cuanto ya
existe un administrador activo. Las asignaciones posteriores se realizan por
la API; tampoco es posible retirar al último administrador.

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

Las migraciones `secure_backend_only_data_api` y `extend_profiles_catalog`
extienden esa protección a las 36 tablas públicas, agregan perfiles de
instructores, slugs e índices del catálogo. El inventario verificado está en
[`docs/database-inventory.md`](docs/database-inventory.md).

`admin_roles_course_workflow` agrega autorización administrativa, auditoría,
restricciones de integridad y el ciclo `draft → review → published/archived`
sin recrear tablas ni eliminar datos.

## Fases siguientes

1. ~~Seguridad backend-only, perfiles y catálogo inicial.~~
2. **Administración de cursos, instructores y autorización por rol.**
3. **Inscripciones, aula y progreso.**
4. **Reseñas y certificados.**
5. **Integración completa con el frontend y despliegue.**
