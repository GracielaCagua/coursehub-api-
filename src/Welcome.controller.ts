import {Controller, Get} from '@nestjs/common';
import {WelcomeService} from './welcome.Service';

@Controller('welcome')

export class WelcomeController {
    constructor(private readonly welcomeService: WelcomeService) {}
@Get()
getWelcomme(): { message: string } {
    return this.welcomeService.getMessage();
  }
}