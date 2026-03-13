import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCurrentUserDto {
  @ApiPropertyOptional({
    description: 'User name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name: string;
}
