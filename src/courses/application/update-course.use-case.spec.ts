import { jest } from '@jest/globals';
import { UserRole } from '../../users/user-role.enum';
import {
  CourseNotFoundError,
  CourseOwnershipError,
  CourseUpdateRecord,
  CourseUpdateRepository,
  UpdateCourseUseCase,
} from './update-course.use-case';

describe('UpdateCourseUseCase', () => {
  const course: CourseUpdateRecord = {
    id: 5,
    title: 'NestJS',
    level: 'beginner',
    isPublished: true,
    createdById: 7,
  };
  const repository: jest.Mocked<CourseUpdateRepository> = {
    findById: jest.fn(),
    save: jest.fn(),
  };
  const useCase = new UpdateCourseUseCase(repository);
  const owner = { id: 7, role: UserRole.TEACHER };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates a course owned by the teacher without HTTP or persistence details', async () => {
    repository.findById.mockResolvedValue(course);
    repository.save.mockImplementation(async (updated) => updated);

    await expect(
      useCase.execute(5, { title: 'Updated' }, owner),
    ).resolves.toEqual({ ...course, title: 'Updated' });
    expect(repository.save).toHaveBeenCalledWith({
      ...course,
      title: 'Updated',
    });
  });

  it('keeps the ownership rule in the use case', async () => {
    repository.findById.mockResolvedValue(course);

    await expect(
      useCase.execute(
        5,
        { title: 'Updated' },
        {
          id: 8,
          role: UserRole.TEACHER,
        },
      ),
    ).rejects.toBeInstanceOf(CourseOwnershipError);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('allows an administrator to update any course', async () => {
    repository.findById.mockResolvedValue(course);
    repository.save.mockImplementation(async (updated) => updated);

    await expect(
      useCase.execute(
        5,
        { title: 'Updated' },
        {
          id: 9,
          role: UserRole.ADMIN,
        },
      ),
    ).resolves.toEqual({ ...course, title: 'Updated' });
  });

  it('reports a missing course before attempting to save', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(404, { title: 'Updated' }, owner),
    ).rejects.toBeInstanceOf(CourseNotFoundError);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
