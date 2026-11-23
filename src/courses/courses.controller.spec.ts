import { jest } from '@jest/globals';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UserRole } from '../users/user-role.enum';
import {
  CourseNotFoundError,
  CourseOwnershipError,
  CourseUpdateRecord,
  UpdateCourseInput,
  UpdateCourseUseCase,
} from './application/update-course.use-case';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

describe('CoursesController', () => {
  let controller: CoursesController;
  const updateCourse: jest.Mocked<Pick<UpdateCourseUseCase, 'execute'>> = {
    execute: jest.fn(),
  };
  const user: AuthenticatedUser = {
    id: 7,
    email: 'teacher@example.test',
    role: UserRole.TEACHER,
  };
  const request = { user } as Parameters<CoursesController['update']>[2];

  beforeEach(async () => {
    jest.clearAllMocks();
    const builder = Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        { provide: CoursesService, useValue: {} },
        { provide: UpdateCourseUseCase, useValue: updateCourse },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true });
    const module: TestingModule = await builder.compile();

    controller = module.get<CoursesController>(CoursesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates the id, update DTO, and authenticated user to the use case', async () => {
    const id = 5;
    const body: UpdateCourseInput = {
      title: 'Updated NestJS',
      level: 'advanced',
      isPublished: false,
    };
    const updatedCourse: CourseUpdateRecord = {
      id,
      title: 'Updated NestJS',
      level: 'advanced',
      isPublished: false,
      createdById: user.id,
    };
    updateCourse.execute.mockResolvedValue(updatedCourse);

    await expect(
      controller.update(id, body, request),
    ).resolves.toEqual({
      id,
      title: 'Updated NestJS',
      level: 'advanced',
      isPublished: false,
      createdBy: { id: user.id },
    });
    expect(updateCourse.execute).toHaveBeenCalledWith(id, body, user);
  });

  it('translates a missing-course error from the use case to HTTP 404', async () => {
    updateCourse.execute.mockRejectedValue(new CourseNotFoundError(404));

    await expect(controller.update(404, {}, request)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('translates an ownership error from the use case to HTTP 403', async () => {
    updateCourse.execute.mockRejectedValue(new CourseOwnershipError());

    await expect(controller.update(5, {}, request)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rethrows unexpected errors from the use case', async () => {
    const error = new Error('Unexpected use case failure');
    updateCourse.execute.mockRejectedValue(error);

    await expect(controller.update(5, {}, request)).rejects.toBe(error);
  });
});
