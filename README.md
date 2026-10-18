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

## Sesión 11 · Filtros, paginación y ordenamiento

`GET /courses` acepta: `level`, `isPublished`, `page` (≥1, por defecto 1), `limit` (1–50, por defecto 10), `sortBy` (`id` | `title` | `level`) y `order` (`ASC` | `DESC`).

```http
GET /courses?page=1&limit=3&sortBy=title&order=asc
```
```json
{
  "items": [ { "id": 3, "title": "Arquitectura NestJS", "level": "intermediate", "isPublished": true } ],
  "meta": { "total": 9, "page": 1, "limit": 3, "totalPages": 3, "nextPage": 2, "previousPage": null }
}
```

Los parámetros inválidos responden 400 sin llegar al repositorio.

---

## Instalación y configuración (Semana 7)

### Requisitos
- Node.js 20 o superior
- PostgreSQL 14 o superior, con una base de datos llamada `coursehub`

### Pasos para iniciar
1. Clonar el repositorio e instalar dependencias:
```bash
   npm install
```
2. Copiar la plantilla de variables y completar la contraseña local de PostgreSQL:
```bash
   cp .env.example .env
```
3. Iniciar la API:
```bash
   npm run start:dev
```

>  El archivo `.env` contiene credenciales reales y **nunca** debe subirse al repositorio (está en `.gitignore`).

### Variables de entorno

| Variable | Obligatoria | Por defecto | Descripción |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development`, `test` o `production` |
| `PORT` | No | `3000` | Puerto de la API |
| `LOG_LEVEL` | No | `log` | `debug`, `log`, `warn` o `error` |
| `DB_HOST` | Sí | — | Host de PostgreSQL |
| `DB_PORT` | No | `5432` | Puerto de PostgreSQL |
| `DB_NAME` | Sí | — | Nombre de la base de datos |
| `DB_USER` | Sí | — | Usuario de PostgreSQL |
| `DB_PASSWORD` | Sí | — | Contraseña de PostgreSQL |

Las variables se validan con Joi al iniciar. Si falta una obligatoria o tiene un valor inválido, la API no arranca e indica cuál es.

### Política por ambiente

| Ambiente | `synchronize` |
|---|---|
| `development` | `true`: TypeORM crea y actualiza las tablas automáticamente |
| `test` / `production` | `false`: el esquema no se modifica automáticamente (se usarían migraciones) |

### Propuesta de migración (tarea opcional)

Nombre: `AddCreditsToCourses1729200000000`

```ts
export class AddCreditsToCourses1729200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "courses" ADD "credits" integer NOT NULL DEFAULT 3`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "credits"`);
  }
}
```
`up` agrega la columna `credits` a la tabla de cursos y `down` la elimina para revertir el cambio. No se ejecuta en esta etapa.