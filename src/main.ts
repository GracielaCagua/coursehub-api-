import { LogLevel, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureCors } from './security/cors';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { TimingInterceptor } from './common/timing.interceptor';

const LEVELS: LogLevel[] = ['error', 'warn', 'log', 'debug'];
const logLevel = (process.env.LOG_LEVEL ?? 'log') as LogLevel;
const logger = LEVELS.includes(logLevel)
  ? LEVELS.slice(0, LEVELS.indexOf(logLevel) + 1)
  : LEVELS.slice(0, 3);

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger });
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new TimingInterceptor());
  const config = app.get(ConfigService);
  configureCors(app, config.getOrThrow<string>('CORS_ORIGINS'));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port);
  console.log(
    `CourseHub API escuchando en el puerto ${port} (${config.get('NODE_ENV')})`,
  );
}
bootstrap();
