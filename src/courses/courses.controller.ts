import { Controller,Get,  Param, Query } from '@nestjs/common';
import { CoursesService} from './courses.service';


@Controller('courses')
export class CoursesController {
    constructor(private readonly CoursesService: CoursesService) {}

    @Get()
    findAll(@Query('level') level?: string) {
        return this.CoursesService.findAll(level);
         }
    @Get(':id')
  findOne(@Param('id') id: string) {
    return this.CoursesService.findOne(Number(id));
  }

  
}

