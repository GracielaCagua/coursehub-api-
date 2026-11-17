import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UserRole } from '../users/user-role.enum';
import { Course } from './entities/course.entity';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;
  const courseRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
  };
  const owner: AuthenticatedUser = {
    id: 7,
    email: 'teacher@example.test',
    role: UserRole.TEACHER,
  };
  const course = {
    id: 5,
    title: 'NestJS',
    level: 'beginner',
    isPublished: true,
    createdBy: { id: owner.id },
  } as Course;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
          useValue: courseRepository,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('assigns the authenticated creator when creating a course', async () => {
    courseRepository.create.mockReturnValue(course);
    courseRepository.save.mockResolvedValue(course);

    await service.create(
      { title: 'NestJS', level: 'beginner' },
      owner,
    );

    expect(courseRepository.create).toHaveBeenCalledWith({
      title: 'NestJS',
      level: 'beginner',
      createdBy: { id: owner.id },
    });
  });

  it('allows the teacher who owns a course to update it', async () => {
    courseRepository.findOne.mockResolvedValue(course);
    courseRepository.save.mockResolvedValue(course);

    await expect(
      service.update(5, { title: 'Updated' }, owner),
    ).resolves.toBe(course);
  });

  it('rejects a teacher who does not own a course', async () => {
    courseRepository.findOne.mockResolvedValue(course);
    const otherTeacher = { ...owner, id: 8 };

    await expect(
      service.update(5, { title: 'Updated' }, otherTeacher),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(courseRepository.save).not.toHaveBeenCalled();
  });

  it('allows an administrator to update any course', async () => {
    courseRepository.findOne.mockResolvedValue(course);
    courseRepository.save.mockResolvedValue(course);
    const admin = { ...owner, id: 9, role: UserRole.ADMIN };

    await expect(
      service.update(5, { title: 'Updated' }, admin),
    ).resolves.toBe(course);
  });
});
