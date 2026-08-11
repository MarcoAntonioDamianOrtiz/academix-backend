# Inventario de Supabase — Fase 2

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

## Extensiones del modelo

| Objeto | Cambio |
|---|---|
| `usuarios` | Se agregó `pais` para el contrato de perfil. |
| `perfiles_instructores` | Perfil uno-a-uno con especialidad y años de experiencia. |
| `categorias` | Se agregó `slug` obligatorio y único; se conservaron las 8 categorías existentes. |
| `cursos` | Se agregó `slug` obligatorio y único. |
| `cursos_instructores` | Solo puede existir un instructor principal por curso. |

Los índices nuevos cubren los filtros iniciales del catálogo y las claves
foráneas que usa esta fase. Los avisos de índices sin uso se conservaron porque
las tablas de negocio aún están vacías y no existe tráfico representativo.

## Migraciones aplicadas

| Versión | Nombre |
|---|---|
| `20260811153229` | `setup_auth_profile` |
| `20260811172558` | `secure_backend_only_data_api` |
| `20260811172617` | `extend_profiles_catalog` |
