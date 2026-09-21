import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterEnrollmentDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId?: number;
}