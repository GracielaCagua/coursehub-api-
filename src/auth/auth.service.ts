import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create(dto.email, passwordHash);
    // Respuesta explícita: nunca se devuelve password ni passwordHash
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }
}
