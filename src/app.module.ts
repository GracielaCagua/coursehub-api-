import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';

import { CoursesModule } from './courses/courses.module';
import { StudentsModule } from './students/students.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    // Sesión 13: configuración global validada al iniciar
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        PORT: Joi.number().port().default(3000),
        LOG_LEVEL: Joi.string()
          .valid('debug', 'log', 'warn', 'error')
          .default('log'),
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().port().default(5432),
        DB_NAME: Joi.string().required(),
        DB_USER: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string()
          .pattern(/^\d+(ms|s|m|h|d|w|y)$/)
          .default('15m'),
      }),
    }),

    // Sesión 14: TypeORM configurado según el ambiente
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const nodeEnv = config.getOrThrow<string>('NODE_ENV');
        const synchronize = nodeEnv === 'development';

        // Registro NO sensible: nunca se imprime la contraseña ni el objeto completo
        new Logger('Database').log(
          `Ambiente: ${nodeEnv} | synchronize: ${synchronize}`,
        );

        return {
          type: 'postgres' as const,
          host: config.getOrThrow<string>('DB_HOST'),
          port: config.getOrThrow<number>('DB_PORT'),
          username: config.getOrThrow<string>('DB_USER'),
          password: config.getOrThrow<string>('DB_PASSWORD'),
          database: config.getOrThrow<string>('DB_NAME'),
          autoLoadEntities: true,
          synchronize,
        };
      },
    }),

    CoursesModule,
    StudentsModule,
    EnrollmentsModule,
    // Sesión 15: usuarios y registro con hash
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}