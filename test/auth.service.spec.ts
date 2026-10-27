import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { User } from '../src/users/entities/user.entity';

describe('AuthService', () => {
  let authService: AuthService;
  const usersService = {
    findByEmailWithPassword: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get(AuthService);

    const user: User = {
      id: 1,
      email: 'demo@example.com',
      passwordHash: await bcrypt.hash('correct-password', 4),
      createdAt: new Date('2026-10-27T00:00:00.000Z'),
    };
    usersService.findByEmailWithPassword.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue('signed-token');
  });

  it('emits a token after valid credentials and returns only safe user fields', async () => {
    await expect(
      authService.login({
        email: 'demo@example.com',
        password: 'correct-password',
      }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: {
        id: 1,
        email: 'demo@example.com',
        createdAt: new Date('2026-10-27T00:00:00.000Z'),
      },
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 1,
      email: 'demo@example.com',
    });
  });

  it('does not emit a token when the password is incorrect', async () => {
    await expect(
      authService.login({
        email: 'demo@example.com',
        password: 'incorrect-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('does not emit a token when the account does not exist', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'correct-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
