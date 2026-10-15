import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/cretae-course.dto';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
  ) {}

  findAll(level?: string): Promise<Course[]> {
    return this.coursesRepository.find({
      where: level ? { level } : {},
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.coursesRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException(`No existe un curso con el ID ${id}`);
    }
    return course;
  }

  create(createCourseDto: CreateCourseDto): Promise<Course> {
    const course = this.coursesRepository.create(createCourseDto);
    return this.coursesRepository.save(course);
  }

  async update(id: number, input: { title?: string; level?: string }): Promise<Course> {
    const course = await this.findOne(id);
    Object.assign(course, input);
    return this.coursesRepository.save(course);
  }

  async remove(id: number): Promise<Course> {
    const course = await this.findOne(id);
    try {
      await this.coursesRepository.remove(course);
    } catch {
      throw new ConflictException('No se puede eliminar un curso que tiene matrículas');
    }
    return { ...course, id };
  }
}