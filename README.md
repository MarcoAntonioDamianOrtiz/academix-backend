# academix-backend

API REST de **Academix**, la plataforma educativa. Proyecto **completamente
independiente** de `academix-frontend`: repositorio propio, `package.json`
propio, variables de entorno propias y despliegue propio.

## Propósito

Este backend es responsable de la lógica de negocio, la validación, la
autorización y el acceso seguro a Supabase PostgreSQL. `academix-frontend`
no se conecta directamente a Supabase para autenticación, datos ni reglas
de negocio: todo pasa por esta API.

En la **Fase 1 del backend** se consolida la infraestructura HTTP sobre la
que se construirán los módulos del dominio: configuración validada, CORS
con lista de orígenes, cabeceras seguras, errores tipados, respuestas
paginadas, cierre ordenado, pruebas y CI. El único endpoint funcional sigue
siendo `GET /api/v1/health`; la base de datos se conectará en la Fase 2.

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
│   │   ├── cors.ts             # política CORS centralizada
│   │   └── env.ts              # lectura y validación (Zod) de variables de entorno
│   ├── controllers/
│   │   └── health.controller.ts
│   ├── errors/
│   │   └── app-error.ts        # errores operativos seguros y tipados
│   ├── routes/
│   │   ├── health.routes.ts
│   │   └── index.ts            # registra todos los routers de /api/v1
│   ├── middleware/
│   │   ├── error-handler.ts    # manejador central de errores (JSON, sin stack trace al cliente)
│   │   └── not-found.ts        # 404 en formato JSON consistente
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

Las carpetas `services/` y `repositories/` aparecerán cuando exista lógica
de negocio real. No se crean capas vacías solo para aparentar arquitectura.

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

Este backend será el único componente autorizado para usar la clave secreta
de Supabase. Se empleará `SUPABASE_SECRET_KEY` (formato moderno) en el entorno
del servidor y nunca se confirmará en Git ni se copiará al frontend. La
conexión permanecerá desactivada hasta contar con acceso administrativo al
proyecto.

## Fases siguientes

1. **Fase 2:** conexión segura con Supabase, cliente del servidor y health
   interno de base de datos.
2. **Fase 3:** migración inicial de PostgreSQL, restricciones, índices y RLS.
3. **Fase 4:** autenticación mediante endpoints del backend y verificación de JWT.
4. **Fase 5:** perfiles, catálogo, categorías e instructores.
5. **Fase 6:** inscripciones, aula y progreso.
6. **Fase 7:** reseñas y certificados.
7. **Fase 8:** integración completa con el frontend, seguridad y despliegue.
