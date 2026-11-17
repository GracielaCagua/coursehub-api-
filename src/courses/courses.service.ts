import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/cretae-course.dto';
import { CoursesQueryDto } from './dto/courses-query.dto';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UserRole } from '../users/user-role.enum';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
  ) {}

  // Sesión 11: filtro + paginación + ordenamiento en la base de datos
  async findAll(query: CoursesQueryDto) {
    const { level, isPublished, page, limit, sortBy, order } = query;

    const where: FindOptionsWhere<Course> = {};
    if (level) where.level = level;
    if (isPublished !== undefined) where.isPublished = isPublished;

    const [items, total] = await this.coursesRepository.findAndCount({
      where,
      // Desempate por id para que el orden sea estable entre páginas
      order: sortBy === 'id' ? { id: order } : { [sortBy]: order, id: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async findOne(id: number): Promise<Course> {
    const course = await this.coursesRepository.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException(`No existe un curso con el ID ${id}`);
    }
    return course;
  }

  create(
    createCourseDto: CreateCourseDto,
    actor: AuthenticatedUser,
  ): Promise<Course> {
    const course = this.coursesRepository.create({
      ...createCourseDto,
      createdBy: { id: actor.id },
    });
    return this.coursesRepository.save(course);
  }

  async update(
    id: number,
    input: { title?: string; level?: string; isPublished?: boolean },
    actor: AuthenticatedUser,
  ): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    if (!course) {
      throw new NotFoundException(`No existe un curso con el ID ${id}`);
    }

    const canManageAny = actor.role === UserRole.ADMIN;
    const isOwner = course.createdBy?.id === actor.id;
    if (!canManageAny && !isOwner) {
      throw new ForbiddenException('You cannot modify this course');
    }

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