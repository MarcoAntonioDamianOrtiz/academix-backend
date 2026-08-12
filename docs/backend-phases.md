# Fases oficiales del backend de Academix

Este documento es la referencia única de numeración. Algunos commits anteriores
agruparon varias fases para mantener operaciones relacionadas en una sola
migración; eso no cambia el alcance oficial.

| Fase | Alcance | Estado del código |
|---|---|---|
| 1 | Fundamentos y arquitectura base | Completa |
| 2 | Autenticación y seguridad con Supabase | Completa después de la regularización 6.5 |
| 3 | Modelo de datos y migraciones | Completa después de los índices 6.5 |
| 4 | Usuarios, roles y perfiles | Completa |
| 5 | Catálogo de cursos | Completa; requiere datos reales para validación integral |
| 6 | Inscripciones y progreso | Completa; requiere datos reales para validación integral |
| 7 | Aula virtual y contenido educativo | Base implementada; siguiente fase oficial a cerrar |
| 8 | Reseñas y calificaciones | Implementada anticipadamente; pendiente validación integral |
| 9 | Certificados | Implementada anticipadamente; pendiente validación e integración visual |
| 10 | Integración final, seguridad y producción | Pendiente |

## Correspondencia de migraciones

| Migración | Fases oficiales |
|---|---|
| `setup_auth_profile` | 2 y base de 4 |
| `secure_backend_only_data_api` | 2 y 3 |
| `extend_profiles_catalog` | 3, 4 y 5 |
| `admin_roles_course_workflow` | 4 y 5 |
| `student_enrollments_progress` | 6 |
| `index_enrollment_foreign_keys` | 6 |
| `course_content_authoring_storage` | 7 |
| `reviews_certificates` | 8 y 9 |
| `phase_6_5_foreign_key_indexes` | Regularización previa a 7 |

## Criterio para cerrar la Fase 7

- Módulos y lecciones ordenados y accesibles desde el aula.
- Recursos externos y archivos privados autorizados por inscripción.
- Reproducción de audio/video con respuestas parciales HTTP (`Range`).
- Tracking de progreso coherente con lecciones activas.
- Prueba real del flujo curso → inscripción → aula → progreso.
- Contrato y guía de validación actualizados.
