# academix-backend

API REST de **Academix**, la plataforma educativa. Proyecto **completamente
independiente** de `academix-frontend`: repositorio propio, `package.json`
propio, variables de entorno propias y despliegue propio.

## Propósito

Este backend es responsable de la lógica de negocio, la validación, la
autorización y el acceso seguro a la base de datos (Supabase PostgreSQL,
a partir de la Fase 5). `academix-frontend` nunca accede directamente a
Supabase con privilegios de escritura ni conoce claves sensibles: todo
pasa por esta API.

En su estado actual (**Fase 3**), el backend solo expone un endpoint de
verificación (`/api/v1/health`) y la infraestructura base (middlewares,
manejo de errores, configuración) sobre la que se construirán el resto
de los endpoints en las fases siguientes.

## Stack

- Node.js (>= 20, probado con Node 22/24)
- Express 4
- TypeScript (`strict: true`)
- Zod (validación de variables de entorno; se usará también para validar
  requests a partir de la Fase 6)
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
| `FRONTEND_URL` | **Sí** | URL exacta del frontend autorizado para CORS, ej. `http://localhost:5173`. Sin esta variable el servidor **no arranca**. |

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

Las pruebas (`tests/health.test.ts`, Vitest + Supertest) **no requieren un
`.env` local**. `vitest.config.ts` define `test.env` con valores seguros
de prueba (`NODE_ENV=test`, `PORT=3000`, `FRONTEND_URL=http://localhost:5173`)
que se inyectan en `process.env` únicamente durante la ejecución de
Vitest, antes de que se cargue `src/config/env.ts`. Esto permite clonar
el repositorio y ejecutar `npm install && npm test` sin ningún paso
manual de configuración.

## Estructura del proyecto

```
academix-backend/
├── src/
│   ├── config/
│   │   └── env.ts              # lectura y validación (Zod) de variables de entorno
│   ├── controllers/
│   │   └── health.controller.ts
│   ├── routes/
│   │   ├── health.routes.ts
│   │   └── index.ts            # registra todos los routers de /api/v1
│   ├── middleware/
│   │   ├── error-handler.ts    # manejador central de errores (JSON, sin stack trace al cliente)
│   │   └── not-found.ts        # 404 en formato JSON consistente
│   ├── types/
│   │   └── api.types.ts        # ApiSuccess<T> / ApiErrorResponse / ApiResponse<T>
│   ├── utils/
│   │   └── api-response.ts     # helpers successResponse() / errorResponse()
│   ├── app.ts                  # crea y configura la app Express (sin arrancarla)
│   └── server.ts               # arranca el servidor HTTP
├── tests/
│   └── health.test.ts
├── .env.example
├── package.json
├── tsconfig.json
└── eslint.config.js
```

No existen (todavía) carpetas `services/` ni `repositories/`: no hay
lógica de negocio más allá de responder "estoy vivo". Se agregarán en la
Fase 6, cuando implementemos `contact_messages`.

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

Toda la API responde con uno de estos dos formatos, sin excepciones:

**Éxito:**
```json
{ "success": true, "data": {} }
```

**Error:**
```json
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Mensaje seguro.", "fields": {} }
}
```

## Relación futura con academix-frontend

`academix-frontend` consumirá esta API mediante `VITE_API_URL` (definida
en su propio `.env`), por ejemplo:

```
VITE_API_URL=http://localhost:3000/api/v1
```

El cliente HTTP del frontend (`src/services/api.ts`) ya está preparado
para esto desde la Fase 2. La conexión real (`api.get("/health")`) se
implementa en la **Fase 4**.

## Relación futura con Supabase

A partir de la Fase 5 este backend será el único componente autorizado
para comunicarse con Supabase PostgreSQL usando la `SUPABASE_SERVICE_ROLE_KEY`
(que **nunca** debe existir en `academix-frontend`). El frontend seguirá
sin acceso directo a la base de datos: todo pasa por esta API.
