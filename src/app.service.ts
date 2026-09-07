import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'CourseHub API esta en linea y funcionando correctamente';
  }
}
