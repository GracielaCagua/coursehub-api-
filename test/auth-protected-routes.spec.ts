import { jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';

// Keep Jest's ESM runner isolated from the throttler package's CommonJS entry.
jest.unstable_mockModule('@nestjs/throttler', () => {
  class TestThrottlerGuard {
    canActivate(): boolean {
      return true;
    }
  }

  class TestThrottlerModule {}

  return {
    Throttle: () => () => undefined,
    ThrottlerGuard: TestThrottlerGuard,
    ThrottlerModule: {
      forRoot: () => ({ module: TestThrottlerModule }),
    },
  };
});

const { afterEach, beforeEach, describe, expect, it } =
  await import('@jest/globals');
const { ConflictException, ValidationPipe } = await import('@nestjs/common');
const { ConfigService } = await import('@nestjs/config');
const { APP_GUARD } = await import('@nestjs/core');
const { JwtModule } = await import('@nestjs/jwt');
const { PassportModule } = await import('@nestjs/passport');
const { ThrottlerGuard, ThrottlerModule } =
  await import('@nestjs/throttler');
const { Test } = await import('@nestjs/testing');
const { default: request } = await import('supertest');
const { AuthController } = await import('../src/auth/auth.controller');
const { AuthService } = await import('../src/auth/auth.service');
const { JwtAuthGuard } = await import('../src/auth/guards/jwt-auth.guard');
const { RolesGuard } = await import('../src/auth/guards/roles.guard');
const { JwtStrategy } = await import('../src/auth/strategies/jwt.strategy');
const { CoursesController } = await import('../src/courses/courses.controller');
const { CoursesService } = await import('../src/courses/courses.service');
const { EnrollmentsController } =
  await import('../src/enrollments/enrollments.controller');
const { EnrollmentsService } =
  await import('../src/enrollments/enrollments.service');
const { configureCors } = await import('../src/security/cors');
const { UserRole } = await import('../src/users/user-role.enum');
const { JwtService } = await import('@nestjs/jwt');

const JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';

describe('JWT protected routes', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let validToken: string;
  const enrollmentsService = {
    create: jest.fn(),
  };
  const authService = {
    login: jest.fn().mockResolvedValue({
      accessToken: 'practice-token',
      user: { id: 1, email: 'demo@example.com', role: UserRole.STUDENT },
    }),
  };
  const coursesService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ session: false }),
        JwtModule.register({ secret: JWT_SECRET }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
      ],
      controllers: [AuthController, EnrollmentsController, CoursesController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => JWT_SECRET },
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: AuthService, useValue: authService },
        { provide: EnrollmentsService, useValue: enrollmentsService },
        { provide: CoursesService, useValue: coursesService },
      ],
    }).compile();

    jwtService = moduleRef.get(JwtService);
    validToken = await jwtService.signAsync({
      sub: 1,
      email: 'demo@example.com',
    });

    app = moduleRef.createNestApplication();
    configureCors(app, 'http://localhost:5173');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns only the authenticated identity from GET /auth/me', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200)
      .expect({ id: 1, email: 'demo@example.com', role: UserRole.STUDENT });
  });

  it('rejects missing, malformed, altered, expired, and invalid-payload tokens', async () => {
    const alteredToken = `${validToken.slice(0, -1)}${validToken.endsWith('a') ? 'b' : 'a'}`;
    const expiredToken = await jwtService.signAsync(
      { sub: 1, email: 'demo@example.com' },
      { expiresIn: -1 },
    );
    const invalidPayloadToken = await jwtService.signAsync({
      sub: '1',
      email: 'demo@example.com',
    });
    const invalidRoleToken = await jwtService.signAsync({
      sub: 1,
      email: 'demo@example.com',
      role: 'administrator',
    });

    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Token ${validToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${alteredToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${invalidPayloadToken}`)
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${invalidRoleToken}`)
      .expect(401);
  });

  it('rejects unauthenticated enrollment creation before calling the service', async () => {
    await request(app.getHttpServer())
      .post('/enrollments')
      .send({ studentId: 1, courseId: 1 })
      .expect(401);

    expect(enrollmentsService.create).not.toHaveBeenCalled();
  });

  it('continues validating the enrollment DTO for authenticated requests', async () => {
    await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ studentId: 0, courseId: 1 })
      .expect(400);

    expect(enrollmentsService.create).not.toHaveBeenCalled();
  });

  it('preserves enrollment business-rule errors for authenticated requests', async () => {
    enrollmentsService.create.mockRejectedValueOnce(
      new ConflictException(
        'El estudiante ya se encuentra matriculado en este curso',
      ),
    );

    await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ studentId: 1, courseId: 1 })
      .expect(409);

    expect(enrollmentsService.create).toHaveBeenCalledWith({
      studentId: 1,
      courseId: 1,
    });
  });

  it('returns 401 for a missing token and 403 for non-admin course deletion', async () => {
    const teacherToken = await jwtService.signAsync({
      sub: 2,
      email: 'teacher@example.com',
      role: UserRole.TEACHER,
    });

    await request(app.getHttpServer()).delete('/courses/1').expect(401);
    await request(app.getHttpServer())
      .delete('/courses/1')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .delete('/courses/1')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(403);

    expect(coursesService.remove).not.toHaveBeenCalled();
  });

  it('allows an administrator to delete a course', async () => {
    const adminToken = await jwtService.signAsync({
      sub: 3,
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    });

    await request(app.getHttpServer())
      .delete('/courses/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(coursesService.remove).toHaveBeenCalledWith(1);
  });

  it('allows a teacher through the role guard for course updates', async () => {
    const teacherToken = await jwtService.signAsync({
      sub: 2,
      email: 'teacher@example.com',
      role: UserRole.TEACHER,
    });

    await request(app.getHttpServer())
      .patch('/courses/1')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ title: 'Updated' })
      .expect(200);

    expect(coursesService.update).toHaveBeenCalledWith(
      1,
      { title: 'Updated' },
      { id: 2, email: 'teacher@example.com', role: UserRole.TEACHER },
    );
  });

  it('allows CORS only from the configured origin without bypassing JWT auth', async () => {
    const preflight = await request(app.getHttpServer())
      .options('/auth/me')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization')
      .expect(204);

    expect(preflight.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );

    const allowedOriginWithoutToken = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Origin', 'http://localhost:5173')
      .expect(401);
    expect(
      allowedOriginWithoutToken.headers['access-control-allow-origin'],
    ).toBe('http://localhost:5173');

    const disallowedOrigin = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Origin', 'http://localhost:5174')
      .expect(401);
    expect(
      disallowedOrigin.headers['access-control-allow-origin'],
    ).toBeUndefined();
  });
});
