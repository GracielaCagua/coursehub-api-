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
| `JWT_SECRET` | Sí | — | Secreto aleatorio de al menos 32 caracteres; no se comparte |
| `JWT_EXPIRES_IN` | No | `15m` | Duración del token de acceso |

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
---

## Etapa 3 · Semana 8 · Cuentas y autenticación inicial

### Endpoints de acceso

| Método | Ruta | Éxito | Errores |
|---|---|---|---|
| POST | `/auth/register` | 201 `{ id, email, createdAt }` | 400 cuerpo inválido · 409 correo ya registrado |
| POST | `/auth/login` | 200 `{ accessToken, user: { id, email, createdAt } }` | 400 cuerpo inválido · 401 `Invalid credentials` |
| GET | `/auth/me` | 200 `{ id, email }` con JWT Bearer válido | 401 token ausente, inválido o expirado |

Ambas rutas reciben `{ "email": string, "password": string }`. El correo se recorta y pasa a minúsculas; la contraseña debe tener entre 8 y 72 caracteres (bcrypt solo usa los primeros 72 bytes).
`POST /enrollments` también requiere un JWT Bearer. Las rutas de lectura y cancelación de matrículas no se protegen en esta etapa.

### Decisiones de seguridad

- La contraseña se guarda solo como hash `bcrypt` (costo 12) en la columna `password_hash`.
- `passwordHash` tiene `select: false`: solo `UsersService.findByEmailWithPassword`, usado por el login, lo carga.
- Las respuestas se arman con `id`, `email` y `createdAt`; nunca se devuelve la entidad completa.
- El login usa `bcrypt.compare`. Correo inexistente y contraseña incorrecta devuelven el mismo 401 para no revelar qué cuentas existen.
- Después de validar las credenciales, el login emite un JWT de acceso con `sub` y `email`; el payload no contiene el hash ni la contraseña.
- `JWT_SECRET` (mínimo 32 caracteres) y `JWT_EXPIRES_IN` (por defecto `15m`) se configuran mediante variables de entorno. Genera un secreto aleatorio para el `.env` local; no uses el valor de ejemplo ni lo subas a Git. El JWT está firmado, no cifrado: su payload se puede leer.
- `GET /auth/me` valida el JWT Bearer y devuelve la identidad del token. `POST /enrollments` requiere autenticación; mantiene la validación del DTO y las reglas de existencia, estado activo y matrícula duplicada.
- `users.email` tiene restricción `UNIQUE`. Si dos registros simultáneos pasan la comprobación previa, el error `23505` de PostgreSQL se traduce a 409 sin exponer detalles del motor.
- `AuthModule` coordina el acceso y `UsersModule` administra la persistencia. `User` se mantiene separado de `Student`.
- Todavía no hay autorización por roles: se agrega en la semana 10.

### Demostración

Para demostrar el flujo de JWT (Sesión 17):

1. Inicia la API con `npm run start:dev`; no imprimas ni compartas el contenido de `.env`.
2. Señala en `.env.example` los nombres `JWT_SECRET` y `JWT_EXPIRES_IN`. El primero debe tener al menos 32 caracteres y el segundo usa `15m` por defecto. Los valores reales se mantienen en el entorno local.
3. Registra una cuenta de práctica o utiliza una cuenta existente mediante [`requests/auth.http`](requests/auth.http).
4. Haz login. Explica que la respuesta contiene `accessToken` y un `user` sin contraseña ni hash. El payload JWT transporta `sub`, `email`, `iat` y `exp`; está firmado, no cifrado. No incluyas el token completo en capturas o evidencia pública.
5. Ejecuta el login nombrado al inicio de [`requests/auth-jwt.http`](requests/auth-jwt.http). El cliente HTTP reutiliza su respuesta localmente en las solicitudes siguientes. Ejecuta `GET /auth/me`: debe responder 200 con la identidad.
6. Ejecuta las solicitudes sin encabezado y con el token alterado: ambas deben responder 401.
7. Elige un estudiante y curso de práctica ya matriculados. Consulta su matrícula, intenta repetir `POST /enrollments` sin token (401), y vuelve a consultar para verificar que no cambió. Con token válido, un cuerpo DTO inválido responde 400; la combinación duplicada responde 409. Esto comprueba que la autenticación no omite los DTOs ni las reglas de negocio y que el intento rechazado no duplica datos.

Usa solo cuentas y datos de práctica. El token puede aparecer en la respuesta del login del cliente HTTP; no lo muestres completo en evidencia pública ni lo copies al archivo.
