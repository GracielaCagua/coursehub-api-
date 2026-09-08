import { Module } from '@nestjs/common'; 
import { AppController } from './app.controller'; 
import { AppService } from './app.service'; 
import { WelcomeController } from './Welcome.controller'; 
import { WelcomeService } from './welcome.Service'; 

@Module({ 
  imports: [], 
  controllers: [AppController, WelcomeController], 
  providers: [AppService, WelcomeService], 
})
export class AppModule {} 