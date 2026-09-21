import { Module } from '@nestjs/common'; 
import { AppController } from './app.controller'; 
import { AppService } from './app.service'; 
import { WelcomeController } from './Welcome.controller'; 
import { WelcomeService } from './welcome.Service'; 
import { CoursesModule } from './courses/courses.module';
import { StudentsModule } from './students/students.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';


@Module({ 
  imports: [CoursesModule, StudentsModule,EnrollmentsModule], 
  controllers: [AppController, WelcomeController], 
  providers: [AppService, WelcomeService], 
})
export class AppModule {} 