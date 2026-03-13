import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOcXXXXX',
    description: 'This is the refresh token.',
  })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
