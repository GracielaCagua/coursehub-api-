import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';
import { Course } from './entities/course.entity';
import {
  COURSE_UPDATE_REPOSITORY,
  UpdateCourseUseCase,
} from './application/update-course.use-case';
import { TypeOrmCourseUpdateRepository } from './infrastructure/typeorm-course-update.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course]),
    AuthModule,
    PassportModule.register({ session: false }),
  ],
  controllers: [CoursesController],
  providers: [
    CoursesService,
    UpdateCourseUseCase,
    {
      provide: COURSE_UPDATE_REPOSITORY,
      useClass: TypeOrmCourseUpdateRepository,
    },
  ],
  exports: [CoursesService],
})
export class CoursesModule {}
