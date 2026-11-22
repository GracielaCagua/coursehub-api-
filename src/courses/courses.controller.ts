import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { UserRole } from '../users/user-role.enum';
import {
  CourseNotFoundError,
  CourseOwnershipError,
  UpdateCourseUseCase,
} from './application/update-course.use-case';
import type { UpdateCourseInput } from './application/update-course.use-case';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/cretae-course.dto';
import { CoursesQueryDto } from './dto/courses-query.dto';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly updateCourse: UpdateCourseUseCase,
  ) {}

  @Get()
  findAll(@Query() query: CoursesQueryDto) {
    return this.coursesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  create(
    @Body() createCourseDto: CreateCourseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.coursesService.create(createCourseDto, request.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCourseInput,
    @Req() request: AuthenticatedRequest,
  ) {
    try {
      const course = await this.updateCourse.execute(id, body, request.user);
      return {
        id: course.id,
        title: course.title,
        level: course.level,
        isPublished: course.isPublished,
        createdBy:
          course.createdById === null ? null : { id: course.createdById },
      };
    } catch (error: unknown) {
      if (error instanceof CourseNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof CourseOwnershipError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.coursesService.remove(id);
  }
}
