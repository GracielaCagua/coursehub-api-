import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { ConflictException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { CoursesController } from '../src/courses/courses.controller';
import { CoursesService } from '../src/courses/courses.service';
import { EnrollmentsController } from '../src/enrollments/enrollments.controller';
import { EnrollmentsService } from '../src/enrollments/enrollments.service';
import { UserRole } from '../src/users/user-role.enum';

const JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';

describe('JWT protected routes', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let validToken: string;
  const enrollmentsService = {
    create: jest.fn(),
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
        { provide: AuthService, useValue: {} },
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
});
