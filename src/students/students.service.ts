import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { FilterStudentDto } from './dto/filter-student.dto';

import { Student } from './entities/student.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    const emailExists = await this.studentsRepository.findOne({
      where: {
        email: createStudentDto.email,
      },
    });

    if (emailExists) {
      throw new ConflictException(
        'Ya existe un estudiante con ese correo electrónico',
      );
    }

    const student = this.studentsRepository.create(createStudentDto);

    return this.studentsRepository.save(student);
  }

  async findAll(filters?: FilterStudentDto): Promise<Student[]> {
    const students = await this.studentsRepository.find();

    return students.filter((student) => {
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

  async findOne(id: number): Promise<Student> {
    const student = await this.studentsRepository.findOne({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException(
        `No existe un estudiante con el ID ${id}`,
      );
    }

    return student;
  }

  async update(
    id: number,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    const student = await this.findOne(id);

    if (
      updateStudentDto.email &&
      updateStudentDto.email !== student.email
    ) {
      const emailExists = await this.studentsRepository.findOne({
        where: {
          email: updateStudentDto.email,
        },
      });

      if (emailExists) {
        throw new ConflictException(
          'Ya existe otro estudiante con ese correo electrónico',
        );
      }
    }

    Object.assign(student, updateStudentDto);

    return this.studentsRepository.save(student);
  }

  async remove(id: number): Promise<Student> {
    const student = await this.findOne(id);

    if (!student.isActive) {
      throw new BadRequestException(
        'No se puede eliminar un estudiante inactivo',
      );
    }

    await this.studentsRepository.remove(student);

    return student;
  }

  async changeStatus(
    id: number,
    isActive: boolean,
  ): Promise<Student> {
    const student = await this.findOne(id);

    student.isActive = isActive;

    return this.studentsRepository.save(student);
  }
}