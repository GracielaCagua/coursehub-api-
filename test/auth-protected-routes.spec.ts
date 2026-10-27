import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import {
  ConflictException,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { AuthService } from '../src/auth/auth.service';
import { EnrollmentsController } from '../src/enrollments/enrollments.controller';
import { EnrollmentsService } from '../src/enrollments/enrollments.service';

describe('JWT protected routes', () => {
  let app: INestApplication;
  const enrollmentsService = {
    create: jest.fn(),
  };
  const jwtService = {
    verifyAsync: jest.fn(async (token: string) => {
      if (token === 'valid-token') {
        return { sub: 1, email: 'demo@example.com' };
      }

      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';
      throw error;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, EnrollmentsController],
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: AuthService, useValue: {} },
        { provide: EnrollmentsService, useValue: enrollmentsService },
      ],
    }).compile();

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

  it('returns the authenticated identity from GET /auth/me', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect({ id: 1, email: 'demo@example.com' });
  });

  it('rejects missing and altered tokens on GET /auth/me', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer altered-token')
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
      .set('Authorization', 'Bearer valid-token')
      .send({ studentId: 0, courseId: 1 })
      .expect(400);

    expect(enrollmentsService.create).not.toHaveBeenCalled();
  });

  it('preserves enrollment business-rule errors for authenticated requests', async () => {
    enrollmentsService.create.mockRejectedValueOnce(
      new ConflictException('El estudiante ya se encuentra matriculado en este curso'),
    );

    await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', 'Bearer valid-token')
      .send({ studentId: 1, courseId: 1 })
      .expect(409);

    expect(enrollmentsService.create).toHaveBeenCalledWith({
      studentId: 1,
      courseId: 1,
    });
  });
});
