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

## Aula y progreso

`GET /users/me/courses/:courseId/learning` es el endpoint agregado requerido
por la pantalla del aula. Debe verificar la inscripción y devolver en una sola
respuesta curso, módulos, lecciones y progreso.

| Método | Ruta | Auth | Respuesta `data` |
|---|---|---:|---|
| GET | `/users/me/courses/:courseId/learning` | Sí | `LearningCourse` |
| PATCH | `/lessons/:lessonId/progress` | Sí | `null` o `204` |

Body de progreso:

```json
{ "completed": true }
```

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
