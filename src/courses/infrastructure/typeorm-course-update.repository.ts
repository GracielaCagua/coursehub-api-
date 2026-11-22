import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  CourseUpdateRecord,
  CourseUpdateRepository,
} from '../application/update-course.use-case';
import { Course } from '../entities/course.entity';

@Injectable()
export class TypeOrmCourseUpdateRepository implements CourseUpdateRepository {
  constructor(
    @InjectRepository(Course)
    private readonly repository: Repository<Course>,
  ) {}

  async findById(id: number): Promise<CourseUpdateRecord | null> {
    const course = await this.repository.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    return course ? this.toRecord(course) : null;
  }

  async save(course: CourseUpdateRecord): Promise<CourseUpdateRecord> {
    const saved = await this.repository.save({
      id: course.id,
      title: course.title,
      level: course.level,
      isPublished: course.isPublished,
      createdBy:
        course.createdById === null ? null : { id: course.createdById },
    });
    return this.toRecord(saved);
  }

  private toRecord(course: Course): CourseUpdateRecord {
    return {
      id: course.id,
      title: course.title,
      level: course.level,
      isPublished: course.isPublished,
      createdById: course.createdBy?.id ?? null,
    };
  }
}
