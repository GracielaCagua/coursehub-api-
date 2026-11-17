import assert from 'node:assert/strict';
import 'reflect-metadata';
import { Controller, Module, Post } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

class LoginController {
  login() {
    return { ok: true };
  }
}

Controller('auth')(LoginController);
const loginDescriptor = Object.getOwnPropertyDescriptor(
  LoginController.prototype,
  'login',
);
Post('login')(LoginController.prototype, 'login', loginDescriptor);
Throttle({ default: { limit: 5, ttl: 60_000 } })(
  LoginController.prototype,
  'login',
  loginDescriptor,
);

class SmokeModule {}

Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
  controllers: [LoginController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})(SmokeModule);

const app = await NestFactory.create(SmokeModule, { logger: false });
await app.listen(0, '127.0.0.1');

try {
  const { port } = app.getHttpServer().address();
  const statuses = [];

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: 'POST',
    });
    statuses.push(response.status);
  }

  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429]);
  console.log('Login rate limit passed: the sixth request returned 429.');
} finally {
  await app.close();
}
