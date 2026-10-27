import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create(dto.email, passwordHash);
    // Respuesta explícita: nunca se devuelve password ni passwordHash
    return { id: user.id, email: user.email, createdAt: user.createdAt };
  }

  async login(dto: LoginDto) {
    const user = await this.validateCredentials(dto.email, dto.password);
    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user,
    };
  }

  private async validateCredentials(email: string, password: string) {
    // bcrypt.compare no descifra: aplica el salt del hash guardado y compara
    const foundUser = await this.usersService.findByEmailWithPassword(email);
    const passwordMatches = foundUser
      ? await bcrypt.compare(password, foundUser.passwordHash)
      : false;

    // Correo inexistente y contraseña incorrecta responden igual
    if (!passwordMatches || !foundUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: foundUser.id,
      email: foundUser.email,
      createdAt: foundUser.createdAt,
    };
  }
}
