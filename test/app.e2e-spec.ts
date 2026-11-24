import { randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types';

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
const { ValidationPipe } = await import('@nestjs/common');
const { JwtService } = await import('@nestjs/jwt');
const { Test } = await import('@nestjs/testing');
const { default: request } = await import('supertest');
const { DataSource } = await import('typeorm');
const { AppModule } = await import('../src/app.module');
const { Course } = await import('../src/courses/entities/course.entity');
const { User } = await import('../src/users/entities/user.entity');
const { UserRole } = await import('../src/users/user-role.enum');

describe('CourseHub API (e2e)', () => {
  let app: INestApplication<App>;
  let testUserEmail: string | undefined;
  let testCourseTitle: string | undefined;

  beforeEach(async () => {
    testUserEmail = undefined;
    testCourseTitle = undefined;
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  it('GET /courses is public and returns a paginated list', () => {
    return request(app.getHttpServer())
      .get('/courses')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(
          expect.objectContaining({
            items: expect.any(Array),
            meta: expect.objectContaining({
              total: expect.any(Number),
              page: 1,
              limit: 10,
            }),
          }),
        );
      });
  });

  it('POST /courses rejects requests without an access token', () => {
    return request(app.getHttpServer())
      .post('/courses')
      .send({ title: 'E2E course', level: 'beginner' })
      .expect(401);
  });

  it('POST /courses creates a course for an authenticated teacher', async () => {
    const dataSource = app.get(DataSource);
    const users = dataSource.getRepository(User);
    const email = `e2e-${randomUUID()}@example.test`;
    const title = `E2E course ${randomUUID()}`;
    testUserEmail = email;
    testCourseTitle = title;

    const teacher = await users.save(
      users.create({
        email,
        passwordHash: 'not-used-by-this-test',
        role: UserRole.TEACHER,
      }),
    );
    const token = await app.get(JwtService).signAsync({
      sub: teacher.id,
      email: teacher.email,
      role: teacher.role,
    });

    await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title, level: 'beginner', isPublished: true })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          title,
          level: 'beginner',
          isPublished: true,
          createdBy: { id: teacher.id },
        });
        expect(body.id).toEqual(expect.any(Number));
      });
  });

  afterEach(async () => {
    try {
      if (testCourseTitle || testUserEmail) {
        const dataSource = app.get(DataSource);
        if (testCourseTitle) {
          await dataSource
            .getRepository(Course)
            .delete({ title: testCourseTitle });
        }
        if (testUserEmail) {
          await dataSource.getRepository(User).delete({ email: testUserEmail });
        }
      }
    } finally {
      await app.close();
    }
  });
});
