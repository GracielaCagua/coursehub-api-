import { Controller,Get,  Param, Post,Patch , Body,Delete, Query } from '@nestjs/common';
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
  @Post()
  create(@Body() body: { title: string; level: string }) {
    return this.CoursesService.create(body);
  }
   @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { title?: string; level?: string },
  ) {
    return this.CoursesService.update(Number(id), body);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.CoursesService.remove(Number(id));
  }
  

}

