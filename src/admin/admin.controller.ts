import { Admin } from '@/admin/entities/admin.entity';
import { Auth } from '@/auths/decorators/auth.decorator';
import { AuthType } from '@/auths/enums/auth-type.enum';
import { ActiveUser } from '@/common/decorators/active-user.decorator';
import { Body, Controller, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminService } from './providers/admin.service';
import { AdminChangePasswordDto } from './dto/admin-change-password.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({
    status: 200,
    description: 'Admin logged in successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() adminLoginDto: AdminLoginDto) {
    return this.adminService.adminLogin(adminLoginDto);
  }

  @Put('change-password')
  @Auth(AuthType.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change admin password (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Admin password changed successfully',
  })
  async changePassword(
    @Body() adminChangePasswordDto: AdminChangePasswordDto,
    @ActiveUser() user: Admin,
  ) {
    return this.adminService.changePassword(user, adminChangePasswordDto);
  }
}
