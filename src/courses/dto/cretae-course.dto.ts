import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsIn(['beginner', 'intermediate', 'advanced'])
  level: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}