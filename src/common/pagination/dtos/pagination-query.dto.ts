import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsPositive, IsString } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    name: 'limit',
    required: false,
    description: 'Number of entries to return',
  })
  @IsOptional()
  @IsPositive()
  limit?: number = 10;

  @ApiPropertyOptional({
    name: 'page',
    required: false,
    description: 'Number of entries to skip from start',
  })
  @IsOptional()
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({
    name: 'search',
    required: false,
    description: 'Search based on text',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
