import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { FilterEnrollmentDto } from './dto/filter-enrollment.dto';
import { Enrollment } from './entities/enrollment.entity';
import { Student } from '../students/entities/student.entity';
import { Course } from '../courses/entities/course.entity';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
  ) {}

  async create(dto: CreateEnrollmentDto): Promise<Enrollment> {
    const { studentId, courseId } = dto;

    const student = await this.studentsRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`No existe un estudiante con el ID ${studentId}`);
    }

    const course = await this.coursesRepository.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`No existe un curso con el ID ${courseId}`);
    }

    if (!student.isActive) {
      throw new BadRequestException('No se puede matricular a un estudiante inactivo');
    }

    const alreadyEnrolled = await this.enrollmentsRepository.exists({
      where: { student: { id: studentId }, course: { id: courseId } },
    });
    if (alreadyEnrolled) {
      throw new ConflictException('El estudiante ya se encuentra matriculado en este curso');
    }

    const enrollment = this.enrollmentsRepository.create({ student, course });
    return this.enrollmentsRepository.save(enrollment);
  }

  // Sesión 12: búsqueda y filtros combinables con QueryBuilder
  async findAll(filters: FilterEnrollmentDto) {
    const { search, studentId, courseId, onlyActive, page, limit } = filters;

    const qb = this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.course', 'course');

    // Cada filtro se agrega solo si el cliente lo envía, siempre con parámetros
    if (search?.trim()) {
      qb.andWhere(
        '(student.name ILIKE :term OR student.email ILIKE :term OR course.title ILIKE :term)',
        { term: `%${search.trim()}%` },
      );
    }
    if (studentId !== undefined) {
      qb.andWhere('student.id = :studentId', { studentId });
    }
    if (courseId !== undefined) {
      qb.andWhere('course.id = :courseId', { courseId });
    }
    if (onlyActive) {
      qb.andWhere('student.isActive = :active', { active: true });
    }

    // Orden estable y paginación
    qb.orderBy('enrollment.createdAt', 'DESC')
      .addOrderBy('enrollment.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async remove(id: number): Promise<Enrollment> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { id },
      relations: { student: true, course: true },
    });
    if (!enrollment) {
      throw new NotFoundException(`No existe una matrícula con el ID ${id}`);
    }
    await this.enrollmentsRepository.remove(enrollment);
    return { ...enrollment, id };
  }
}