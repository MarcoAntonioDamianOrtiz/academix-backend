# Contrato de la API de Academix

Este documento define el contrato que comparten `academix-backend` y
`academix-frontend`. Supabase no se consume directamente desde React:
autenticación, autorización, reglas de negocio y persistencia pasan por el
backend.

## Configuración

- URL base local: `http://localhost:3000/api/v1`
- Variable del frontend: `VITE_API_URL`
- Los nombres JSON se entregan en `camelCase`; el backend transforma las
  columnas `snake_case` de PostgreSQL.

## Sobre común

Éxito:

```json
{ "success": true, "data": {} }
```

Colección paginada:

```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 12, "total": 0, "totalPages": 1 }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos.",
    "fields": { "email": "El correo no es válido." }
  }
}
```

## Autenticación

React no recibe claves secretas de Supabase. `academix-backend` utilizará
Supabase Auth y devolverá el contrato `AuthSession` que ya consume el
frontend:

```json
{
  "user": {
    "id": "uuid",
    "fullName": "Nombre",
    "email": "correo@ejemplo.com",
    "role": "student"
  },
  "accessToken": "jwt",
  "expiresAt": "2026-08-10T20:00:00.000Z"
}
```

El token se envía como `Authorization: Bearer <token>`. El backend debe
verificarlo con Supabase Auth antes de toda operación protegida y nunca debe
confiar en el rol enviado por el navegador.

| Método | Ruta | Auth | Respuesta `data` |
|---|---|---:|---|
| POST | `/auth/login` | No | `AuthSession` |
| POST | `/auth/register` | No | `AuthSession` |
| POST | `/auth/logout` | Sí | `null` o `204` |
| POST | `/auth/password-reset` | No | `null` o `204` |
| GET | `/auth/me` | Sí | `{ user: AuthUser }` |

`POST /auth/register` recibe `{ fullName, email, password }`. Cuando la
confirmación de correo está habilitada en Supabase, puede responder
`403 EMAIL_CONFIRMATION_REQUIRED`; el usuario debe confirmar su correo y
después iniciar sesión.

## Catálogo e instructores

| Método | Ruta | Auth | Respuesta `data` |
|---|---|---:|---|
| GET | `/courses?search=&category=&level=&page=1&limit=12` | No | `CourseSummary[]` + paginación |
| GET | `/courses/:courseId` | No | `CourseDetail` |
| GET | `/courses/:courseId/related` | No | `CourseSummary[]` |
| GET | `/instructors/:instructorId` | No | `InstructorDetail` |
| GET | `/instructors/:instructorId/courses` | No | `CourseSummary[]` |

`GET /courses` acepta los siguientes parámetros:

| Parámetro | Tipo | Regla |
|---|---|---|
| `search` | string | 1–100 caracteres; busca en título y descripción corta. |
| `category` | slug | Categoría activa, por ejemplo `programacion`. |
| `level` | enum | `beginner`, `intermediate` o `advanced`. |
| `page` | integer | Mínimo 1; default 1. |
| `limit` | integer | Entre 1 y 50; default 12. |

El catálogo solo devuelve cursos activos con estado `Publicado` e instructor
principal. Mientras la fase de reseñas no esté implementada, `rating` y
`reviewCount` valen `0`. `related` devuelve hasta cuatro cursos publicados de
la misma categoría.

```json
{
  "id": "uuid",
  "slug": "typescript-desde-cero",
  "title": "TypeScript desde cero",
  "shortDescription": "Aprende a tipar aplicaciones web.",
  "category": { "id": "1", "name": "Programación", "slug": "programacion" },
  "instructor": {
    "id": "uuid",
    "name": "Ana Pérez",
    "specialty": "Desarrollo web"
  },
  "level": "beginner",
  "durationHours": 8,
  "rating": 0,
  "reviewCount": 0,
  "price": 0,
  "certificateEnabled": true
}
```

## Estudiante y perfil

| Método | Ruta | Auth | Respuesta `data` |
|---|---|---:|---|
| GET | `/users/me` | Sí | `UserProfile` |
| PATCH | `/users/me` | Sí | `UserProfile` |
| GET | `/users/me/courses` | Sí | `EnrollmentSummary[]` |
| POST | `/courses/:courseId/enrollments` | Sí | `EnrollmentSummary` |

Una inscripción duplicada responde `409 ENROLLMENT_ALREADY_EXISTS`. El
backend determina el usuario desde el token y aplica una restricción única por
`user_id + course_id`.

La inscripción automática solo admite cursos publicados, gratuitos y que no
requieran aprobación. Los cursos de pago responden `422 PAYMENT_NOT_AVAILABLE`
y los que requieren revisión, `422 COURSE_REQUIRES_APPROVAL`.

`EnrollmentSummary` coincide con el contrato del frontend:

```json
{
  "id": "uuid",
  "course": { "id": "uuid", "title": "TypeScript", "slug": "typescript" },
  "status": "in_progress",
  "progressPercentage": 50,
  "completedLessons": 2,
  "totalLessons": 4,
  "lastAccessedAt": "2026-08-11T18:00:00.000Z"
}
```

El perfil tiene esta forma:

```json
{
  "id": "uuid",
  "fullName": "Ana Pérez",
  "email": "ana@example.com",
  "role": "student",
  "phone": "2461234567",
  "country": "México",
  "bio": "Estudiante de Academix."
}
```

`PATCH /users/me` permite únicamente `fullName`, `phone`, `country` y `bio`,
requiere al menos un campo y nunca acepta el ID, correo o rol enviados por el
navegador.

## Administración e instructores

Las rutas `/admin/*` requieren `Authorization: Bearer` y rol `admin`. Las rutas
`/instructor/*` requieren rol `instructor`. El rol se vuelve a leer desde
Supabase durante la validación del JWT.

| Método | Ruta | Rol | Operación |
|---|---|---|---|
| GET | `/admin/users?search=&role=&page=1&limit=20` | admin | Usuarios y roles activos. |
| PATCH | `/admin/users/:userId/roles` | admin | Reemplaza roles con `{ roles: AppRole[] }`. |
| GET | `/admin/instructors` | admin | Lista perfiles de instructor. |
| PUT | `/admin/instructors/:userId` | admin | Crea/actualiza `{ specialty, experienceYears }`. |
| POST | `/admin/categories` | admin | Crea categoría activa. |
| PATCH | `/admin/categories/:categoryId` | admin | Actualiza o desactiva categoría. |
| GET | `/admin/course-options` | admin | Categorías, niveles, modalidades, idiomas y estados. |
| GET, POST | `/admin/courses` | admin | Lista o crea un borrador. |
| PATCH | `/admin/courses/:courseId` | admin | Actualiza un curso no archivado. |
| PUT | `/admin/courses/:courseId/instructor` | admin | Asigna `{ instructorId }` como principal. |
| POST | `/admin/courses/:courseId/publish` | admin | Publica un curso en revisión y completo. |
| POST | `/admin/courses/:courseId/archive` | admin | Archivado lógico, sin borrar datos. |
| GET | `/instructor/courses` | instructor | Cursos asignados. |
| PATCH | `/instructor/courses/:courseId` | instructor | Edita solo su borrador asignado. |
| POST | `/instructor/courses/:courseId/submit` | instructor | Envía borrador a revisión. |

`AppRole` admite `student`, `instructor` y `admin`. Los estados son `draft`,
`review`, `published` y `archived`. El backend protege al último administrador,
impide publicar sin instructor, descripciones y objetivos, y usa `409` cuando
el estado cambió de forma concurrente.

Además, publicar requiere por lo menos un módulo y una lección activos. Si no
existen responde `422 COURSE_CONTENT_REQUIRED`.

## Autoría y archivos de curso

Las rutas `/authoring/*` requieren JWT y rol `admin` o `instructor`. El
administrador puede trabajar en cursos `draft` y `review`; el instructor solo
en su propio curso asignado mientras siga en `draft`.

| Método | Ruta | Operación |
|---|---|---|
| GET | `/authoring/resource-options` | Tipos de recurso activos. |
| GET | `/authoring/courses/:courseId/content` | Árbol completo para edición. |
| POST | `/authoring/courses/:courseId/modules` | Crea módulo. |
| PATCH | `/authoring/modules/:moduleId` | Actualiza o desactiva módulo. |
| POST | `/authoring/modules/:moduleId/lessons` | Crea lección. |
| PATCH | `/authoring/lessons/:lessonId` | Actualiza o desactiva lección. |
| POST | `/authoring/lessons/:lessonId/resources` | Crea recurso de URL o archivo. |
| PATCH | `/authoring/resources/:resourceId` | Actualiza o desactiva recurso. |
| POST | `/authoring/courses/:courseId/files` | Sube archivo binario privado. |

La carga usa el `Content-Type` real, la cabecera `x-file-name` y un body
binario de máximo 25 MB. Express calcula SHA-256, asigna un nombre aleatorio y
lo guarda en el bucket privado `academix-course-content`. Nunca devuelve la
ruta de Storage al navegador; solo metadatos y el ID del archivo.

Un recurso debe contener exactamente uno de `url` o `fileId`. No se eliminan
filas: `active: false` aplica desactivación lógica. PostgreSQL también impide
modificar contenido cuando el curso ya está `published` o `archived`.

## Aula y progreso

`GET /users/me/courses/:courseId/learning` es el endpoint agregado requerido
por la pantalla del aula. Debe verificar la inscripción y devolver en una sola
respuesta curso, módulos, lecciones y progreso.

| Método | Ruta | Auth | Respuesta `data` |
|---|---|---:|---|
| GET | `/users/me/courses/:courseId/learning` | Sí | `LearningCourse` |
| PATCH | `/lessons/:lessonId/progress` | Sí | `null` o `204` |
| GET | `/lessons/:lessonId/resources/:resourceId/content` | Sí | Archivo binario |

Body de progreso:

```json
{ "completed": true }
```

La actualización devuelve `204`. El backend verifica que la lección esté
activa, pertenezca al curso de la inscripción y que esta se encuentre activa o
finalizada. El progreso se guarda mediante UPSERT y al completar todas las
lecciones cambia la inscripción a `Finalizada`; desmarcar una lección la
regresa a `Activa`.

Cada lección incluye ahora `content` y `resources`. Para archivos, el backend
entrega un `contentPath` bajo `/api/v1`; para enlaces externos entrega `url`.
La descarga valida inscripción activa/finalizada o permisos de autoría y
responde con `Cache-Control: private, no-store`.

## Reseñas y certificados

| Método | Ruta | Auth | Respuesta `data` |
|---|---|---:|---|
| POST | `/courses/:courseId/reviews` | Sí | `CourseReview` |
| GET | `/users/me/certificates` | Sí | `CertificateSummary[]` |
| GET | `/users/me/certificates/:certificateId` | Sí | `CertificateDetail` |

Solo un estudiante que cumpla la regla de finalización puede publicar una
reseña. El backend emite el certificado al alcanzar los criterios del curso y
genera un `credentialCode` único.

## Códigos esperados

- `200`: consulta o actualización correcta.
- `201`: inscripción, registro o reseña creada.
- `204`: operación correcta sin cuerpo.
- `400`: JSON o parámetros inválidos.
- `401`: sesión ausente o inválida.
- `403`: usuario sin autorización para el recurso.
- `404`: recurso inexistente.
- `409`: duplicidad o conflicto de estado.
- `422`: validación semántica.
- `500`: error interno sin detalles sensibles.

Cualquier cambio en este contrato debe actualizar los tipos, servicios,
pruebas y documentación de ambos repositorios en el mismo ciclo de trabajo.
