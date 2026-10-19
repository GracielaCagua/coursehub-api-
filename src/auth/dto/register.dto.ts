import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  // Normaliza: "  ANA@EXAMPLE.COM " -> "ana@example.com"
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt solo usa los primeros 72 bytes
  password: string;
}
