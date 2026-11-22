import { Inject, Injectable } from '@nestjs/common';
import { UserRole } from '../../users/user-role.enum';

export const COURSE_UPDATE_REPOSITORY = Symbol('COURSE_UPDATE_REPOSITORY');

export interface CourseUpdateRecord {
  id: number;
  title: string;
  level: string;
  isPublished: boolean;
  createdById: number | null;
}

export interface CourseUpdateRepository {
  findById(id: number): Promise<CourseUpdateRecord | null>;
  save(course: CourseUpdateRecord): Promise<CourseUpdateRecord>;
}

export type UpdateCourseInput = Partial<
  Pick<CourseUpdateRecord, 'title' | 'level' | 'isPublished'>
>;

export interface CourseActor {
  id: number;
  role: UserRole;
}

export class CourseNotFoundError extends Error {
  constructor(id: number) {
    super(`No existe un curso con el ID ${id}`);
    this.name = CourseNotFoundError.name;
  }
}

export class CourseOwnershipError extends Error {
  constructor() {
    super('You cannot modify this course');
    this.name = CourseOwnershipError.name;
  }
}

@Injectable()
export class UpdateCourseUseCase {
  constructor(
    @Inject(COURSE_UPDATE_REPOSITORY)
    private readonly courses: CourseUpdateRepository,
  ) {}

  async execute(
    id: number,
    input: UpdateCourseInput,
    actor: CourseActor,
  ): Promise<CourseUpdateRecord> {
    const course = await this.courses.findById(id);
    if (!course) {
      throw new CourseNotFoundError(id);
    }

    const isAdmin = actor.role === UserRole.ADMIN;
    const isOwner = course.createdById === actor.id;
    if (!isAdmin && !isOwner) {
      throw new CourseOwnershipError();
    }

    return this.courses.save({ ...course, ...input });
  }
}
