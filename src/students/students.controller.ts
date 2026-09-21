import {Body,Controller,Delete,Get,Param,Patch,Post, Query,} from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentIdPipe } from './pipes/student-id.pipe';
import { FilterStudentDto } from './dto/filter-student.dto';
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  create(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

 @Get()
findAll(@Query() filters: FilterStudentDto) {
  return this.studentsService.findAll(filters);
}
  @Get(':id')
  findOne(@Param('id', StudentIdPipe) id: number) {
    return this.studentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', StudentIdPipe) id: number,
    @Body() updateStudentDto: UpdateStudentDto,
  ) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Delete(':id')
  remove(@Param('id', StudentIdPipe) id: number) {
    return this.studentsService.remove(id);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id', StudentIdPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.studentsService.changeStatus(id, isActive);
  }
}