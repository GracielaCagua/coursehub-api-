## CourseHub API — Cursos, Estudiantes y Matrículas

API construida con NestJS que administra **Cursos**, **Estudiantes** y **Matrículas** usando listas en memoria (sin base de datos). Incluye `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`) y Pipes para validar identificadores de ruta.

### Endpoints

| Módulo | Método | Ruta | Descripción |
|---|---|---|---|
| Cursos | GET | `/courses` | Lista cursos, filtro opcional `?level=` |
| Cursos | GET | `/courses/:id` | Obtiene un curso por id |
| Cursos | POST | `/courses` | Crea un curso |
| Cursos | PATCH | `/courses/:id` | Actualiza un curso |
| Cursos | DELETE | `/courses/:id` | Elimina un curso |
| Estudiantes | POST | `/students` | Crea un estudiante |
| Estudiantes | GET | `/students` | Lista estudiantes, filtros combinables `?career=&semester=&isActive=` |
| Estudiantes | GET | `/students/:id` | Obtiene un estudiante por id |
| Estudiantes | PATCH | `/students/:id` | Actualiza un estudiante |
| Estudiantes | DELETE | `/students/:id` | Elimina un estudiante (solo si está activo) |
| Estudiantes | PATCH | `/students/:id/status` | Cambia el estado activo/inactivo |
| Matrículas | POST | `/enrollments` | Registra una matrícula |
| Matrículas | GET | `/enrollments` | Lista matrículas, filtros combinables `?studentId=&courseId=` |
| Matrículas | GET | `/students/:studentId/enrollments` | Matrículas de un estudiante |
| Matrículas | GET | `/courses/:courseId/enrollments` | Matrículas de un curso |
| Matrículas | DELETE | `/enrollments/:id` | Cancela una matrícula |

### Reglas de negocio de Matrículas

Antes de registrar una matrícula (`POST /enrollments`), el servicio valida en orden:
1. Que el **estudiante exista** (404 si no).
2. Que el **curso exista** (404 si no).
3. Que el **estudiante esté activo** (400 si está inactivo).
4. Que **no exista ya** la misma combinación `studentId` + `courseId` (409 si está duplicada).

### Ejemplos de request / response

**Matrícula válida**
```http
POST /enrollments
Content-Type: application/json

{ "studentId": 1, "courseId": 1 }
```
```json
// 201 Created
{ "id": 1, "studentId": 1, "courseId": 1 }
```

**Matrícula duplicada**
```http
POST /enrollments
{ "studentId": 1, "courseId": 1 }
```
```json
// 409 Conflict
{
  "message": "El estudiante ya se encuentra matriculado en este curso",
  "error": "Conflict",
  "statusCode": 409
}
```

**Estudiante inactivo**
```http
POST /enrollments
{ "studentId": 2, "courseId": 1 }
```
```json
// 400 Bad Request
{
  "message": "No se puede matricular a un estudiante inactivo",
  "error": "Bad Request",
  "statusCode": 400
}
```

**Curso inexistente**
```http
POST /enrollments
{ "studentId": 1, "courseId": 999 }
```
```json
// 404 Not Found
{
  "message": "No existe un curso con el ID 999",
  "error": "Not Found",
  "statusCode": 404
}
```

**Filtros combinables**
```http
GET /enrollments?studentId=1
```
```json
// 200 OK
[ { "id": 1, "studentId": 1, "courseId": 1 } ]
```

**Cancelar una matrícula**
```http
DELETE /enrollments/1
```
```json
// 200 OK
{ "id": 1, "studentId": 1, "courseId": 1 }
```

**Cancelar una matrícula inexistente**
```http
DELETE /enrollments/1
```
```json
// 404 Not Found
{
  "message": "No existe una matrícula con el ID 1",
  "error": "Not Found",
  "statusCode": 404
}
```

### Historial de integración

- Se unificó la rama `practica` (gestión de Estudiantes) sobre `main` (Cursos) mediante `git merge`.
- Se registraron `CoursesModule`, `StudentsModule` y `EnrollmentsModule` en `AppModule`.
- Se creó `EnrollmentsModule` con `EnrollmentsController` y `EnrollmentsService`, manteniendo el controlador libre de reglas de negocio.