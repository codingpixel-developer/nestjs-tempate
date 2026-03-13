import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from './auths/decorators/auth.decorator';
import { AuthType } from './auths/enums/auth-type.enum';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'Server is running',
  })
  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  getHello() {
    return this.appService.healthCheck();
  }
}
