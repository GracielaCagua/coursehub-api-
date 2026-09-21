import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';

export interface Student {
  id: number;
  name: string;
  email: string;
  age: number;
  career: string;
  semester: number;
  isActive: boolean;
}
@Injectable()
export class StudentsService {
  private students: Student[] = [];
  private nextId = 1;

  create(createStudentDto: CreateStudentDto): Student {
    const emailExists = this.students.some(
      (student) => student.email === createStudentDto.email,
    );

    if (emailExists) {
      throw new ConflictException(
        'Ya existe un estudiante con ese correo electrónico',
      );
    }

    const student: Student = {
      id: this.nextId++,
      ...createStudentDto,
    };

    this.students.push(student);

    return student;
  }

  findAll(filters?: FilterStudentDto): Student[] {
  return this.students.filter((student) => {
    if (
      filters?.career &&
      student.career.toLowerCase() !== filters.career.toLowerCase()
    ) {
      return false;
    }

    if (
      filters?.semester !== undefined &&
      student.semester !== filters.semester
    ) {
      return false;
    }

    if (
      filters?.isActive !== undefined &&
      student.isActive !== filters.isActive
    ) {
      return false;
    }

    return true;
  });
}

  findOne(id: number): Student {
    const student = this.students.find((student) => student.id === id);

    if (!student) {
      throw new NotFoundException(
        `No existe un estudiante con el ID ${id}`,
      );
    }

    return student;
  }

  update(id: number, updateStudentDto: UpdateStudentDto): Student {
    const student = this.findOne(id);

    if (
      updateStudentDto.email &&
      updateStudentDto.email !== student.email
    ) {
      const emailExists = this.students.some(
        (student) => student.email === updateStudentDto.email,
      );

      if (emailExists) {
        throw new ConflictException(
          'Ya existe otro estudiante con ese correo electrónico',
        );
      }
    }

    Object.assign(student, updateStudentDto);

    return student;
  }

  remove(id: number): Student {
    const student = this.findOne(id);

    if (!student.isActive) {
      throw new BadRequestException(
        'No se puede eliminar un estudiante inactivo',
      );
    }

    const index = this.students.findIndex(
      (student) => student.id === id,
    );

    this.students.splice(index, 1);

    return student;
  }

  changeStatus(id: number, isActive: boolean): Student {
    const student = this.findOne(id);

    student.isActive = isActive;

    return student;
  }
}
