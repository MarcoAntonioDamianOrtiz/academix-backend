# Inventario de Supabase — Fase 5

Proyecto inspeccionado: `academix` (`kosvorqvtwbajfkyvsne`). El esquema
`public` contiene 36 tablas después de esta fase. La migración es incremental:
no se eliminó ni se recreó ninguna tabla existente.

## Tablas por dominio

| Dominio | Tablas |
|---|---|
| Identidad y perfiles | `roles`, `usuarios`, `usuarios_roles`, `perfiles_instructores`, `estados_verificacion`, `solicitudes_verificacion_utt` |
| Catálogo y contenido | `niveles`, `idiomas`, `modalidades`, `categorias`, `estados_curso`, `cursos`, `cursos_instructores`, `modulos`, `lecciones`, `tipos_recurso`, `recursos`, `tipos_archivo`, `archivos` |
| Inscripciones y evaluación | `metodos_pago`, `estados_pago`, `estados_inscripcion`, `inscripciones`, `progreso_lecciones`, `evaluaciones`, `preguntas_evaluacion`, `resultados_evaluacion` |
| Certificados | `tipos_certificado`, `certificados` |
| Operación | `configuraciones_sistema`, `tipos_accion_auditoria`, `auditoria_sistema`, `sesiones_usuario`, `reportes`, `ejecuciones_reporte`, `notificaciones` |

## Seguridad

- Las 36 tablas tienen RLS habilitado.
- `anon` y `authenticated` no tienen privilegios directos sobre tablas o
  secuencias de `public`.
- No existen políticas para esas claves porque el acceso directo desde React
  está prohibido por la arquitectura del proyecto.
- El cliente secreto de Express conserva acceso como `service_role`.
- Los privilegios predeterminados están revocados. Toda tabla futura debe
  conceder explícitamente al backend solo las operaciones necesarias.

Los avisos `rls_enabled_no_policy` del asesor de Supabase son informativos y
esperados en este modelo backend-only. No deben solucionarse creando políticas
públicas.

Las cuatro funciones administrativas son `SECURITY INVOKER`. `anon`,
`authenticated` y `PUBLIC` tienen cero permisos de ejecución; solo
`service_role` puede invocarlas desde Express. La comprobación posterior a la
migración confirmó las cuatro concesiones y ninguna exposición pública.

## Extensiones del modelo

| Objeto | Cambio |
|---|---|
| `usuarios` | Se agregó `pais` para el contrato de perfil. |
| `perfiles_instructores` | Perfil uno-a-uno con especialidad y años de experiencia. |
| `categorias` | Se agregó `slug` obligatorio y único; se conservaron las 8 categorías existentes. |
| `cursos` | Se agregó `slug` obligatorio y único. |
| `cursos_instructores` | Solo puede existir un instructor principal por curso. |

## Cambios de la Fase 3

- `perfiles_instructores` y `cursos_instructores` permiten desactivación lógica.
- Categorías y cursos registran creación, actualización y usuario responsable.
- Precio, duración y fechas de curso tienen restricciones de integridad.
- Los índices nuevos cubren actores, auditoría, asignaciones y flujo de cursos.
- Triggers actualizan timestamps y auditan categorías/cursos.
- RPC atómicas administran roles, perfiles de instructor, instructor principal
  y el bootstrap de un solo primer administrador.
- El último administrador no puede perder su rol y los cursos no se eliminan:
  pasan al estado `Archivado`.

## Cambios de la Fase 4

- `inscripciones` y `progreso_lecciones` conservan su modelo y reciben fecha
  de actualización automática.
- Restricciones validan montos no negativos, fechas y porcentajes entre 0 y
  100 con consistencia entre `completada` y `fecha_completado`.
- Índices compuestos cubren biblioteca del usuario, progreso de la inscripción
  y búsquedas por lección.
- `academix_enroll_user` crea o reactiva una inscripción de forma atómica.
- `academix_set_lesson_progress` usa UPSERT, valida pertenencia y finaliza o
  reactiva automáticamente la inscripción.
- Ambas funciones son `SECURITY INVOKER`, sin ejecución para `anon`,
  `authenticated` ni `PUBLIC`; únicamente `service_role` puede llamarlas.

## Cambios de la Fase 5

- Se creó el bucket privado `academix-course-content`, con límite de 25 MB y
  lista explícita de MIME permitidos.
- `modulos`, `lecciones` y `recursos` registran creación, actualización y
  actores responsables; `archivos` registra curso, uploader y SHA-256.
- Posiciones, duración, tamaño, hash y origen único URL/archivo tienen
  restricciones de integridad.
- Índices parciales cubren árboles activos, actores y claves foráneas de
  recursos/archivos.
- Triggers actualizan timestamps, auditan cambios y bloquean escrituras de
  contenido cuando el curso está publicado o archivado.
- `anon`, `authenticated` y `PUBLIC` siguen sin acceso directo. Express usa
  `service_role` y descarga desde Storage solo después de autorizar al usuario.

Los índices nuevos cubren los filtros iniciales del catálogo y las claves
foráneas que usa esta fase. Los avisos de índices sin uso se conservaron porque
las tablas de negocio aún están vacías y no existe tráfico representativo.

## Migraciones aplicadas

| Versión | Nombre |
|---|---|
| `20260811153229` | `setup_auth_profile` |
| `20260811172558` | `secure_backend_only_data_api` |
| `20260811172617` | `extend_profiles_catalog` |
| `20260811180231` | `admin_roles_course_workflow` |
| `20260811194429` | `student_enrollments_progress` |
| `20260811194549` | `index_enrollment_foreign_keys` |
| `20260811201127` | `course_content_authoring_storage` |
