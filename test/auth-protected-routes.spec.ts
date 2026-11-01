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
import { EnrollmentsController } from '../src/enrollments/enrollments.controller';
import { EnrollmentsService } from '../src/enrollments/enrollments.service';

const JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';

describe('JWT protected routes', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let validToken: string;
  const enrollmentsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ session: false }),
        JwtModule.register({ secret: JWT_SECRET }),
      ],
      controllers: [AuthController, EnrollmentsController],
      providers: [
        JwtAuthGuard,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => JWT_SECRET },
        },
        { provide: AuthService, useValue: {} },
        { provide: EnrollmentsService, useValue: enrollmentsService },
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
      .expect({ id: 1, email: 'demo@example.com' });
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
});
