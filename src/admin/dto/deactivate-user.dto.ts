import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class DeactivateUserDto {
  @ApiProperty({
    description: 'User ID to deactivate',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  userId: number;
}
