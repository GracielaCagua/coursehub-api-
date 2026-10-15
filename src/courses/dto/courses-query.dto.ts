import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

// Lista cerrada de columnas permitidas para ordenar.
// Nunca se usa directamente el sortBy que envía el cliente.
export const COURSE_SORT_FIELDS = ['id', 'title', 'level'] as const;
export type CourseSortField = (typeof COURSE_SORT_FIELDS)[number];

export class CoursesQueryDto {
  @IsOptional()
  @IsIn(['beginner', 'intermediate', 'advanced'])
  level?: string;

  // Actividad autónoma: filtro de igualdad adicional
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @IsOptional()
  @IsIn(COURSE_SORT_FIELDS)
  sortBy: CourseSortField = 'id';

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC' = 'ASC';
}