import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CoursesService } from '../courses/courses.service';
import { StudentsService } from '../students/students.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

export interface Enrollment {
  id: number;
  studentId: number;
  courseId: number;
}

@Injectable()
export class EnrollmentsService {
  private readonly enrollments: Enrollment[] = [];
  private nextId = 1;

  constructor(
    private readonly coursesService: CoursesService,
    private readonly studentsService: StudentsService,
  ) {}

  create(createEnrollmentDto: CreateEnrollmentDto): Enrollment {
    const { studentId, courseId } = createEnrollmentDto;

    const student = this.studentsService.findOne(studentId);

    const course = this.coursesService.findOne(courseId);
    if (!course) {
      throw new NotFoundException(`No existe un curso con el ID ${courseId}`);
    }

    if (!student.isActive) {
      throw new BadRequestException(
        'No se puede matricular a un estudiante inactivo',
      );
    }

    const alreadyEnrolled = this.enrollments.some(
      (enrollment) =>
        enrollment.studentId === studentId && enrollment.courseId === courseId,
    );
    if (alreadyEnrolled) {
      throw new ConflictException(
        'El estudiante ya se encuentra matriculado en este curso',
      );
    }

    const enrollment: Enrollment = {
      id: this.nextId++,
      studentId,
      courseId,
    };
    this.enrollments.push(enrollment);

    return enrollment;
  }

  findAll(studentId?: number, courseId?: number): Enrollment[] {
    return this.enrollments.filter((enrollment) => {
      if (studentId !== undefined && enrollment.studentId !== studentId) {
        return false;
      }
      if (courseId !== undefined && enrollment.courseId !== courseId) {
        return false;
      }
      return true;
    });
  }

  findByStudent(studentId: number): Enrollment[] {
    this.studentsService.findOne(studentId);
    return this.enrollments.filter(
      (enrollment) => enrollment.studentId === studentId,
    );
  }

  findByCourse(courseId: number): Enrollment[] {
    const course = this.coursesService.findOne(courseId);
    if (!course) {
      throw new NotFoundException(`No existe un curso con el ID ${courseId}`);
    }
    return this.enrollments.filter(
      (enrollment) => enrollment.courseId === courseId,
    );
  }

  remove(id: number): Enrollment {
    const index = this.enrollments.findIndex(
      (enrollment) => enrollment.id === id,
    );

    if (index === -1) {
      throw new NotFoundException(`No existe una matrícula con el ID ${id}`);
    }

    const [removed] = this.enrollments.splice(index, 1);
    return removed;
  }
}