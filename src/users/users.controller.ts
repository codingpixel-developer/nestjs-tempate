import { ActiveUser } from '@/common/decorators/active-user.decorator';
import type { ActiveUserData } from '@/common/interfaces/active-user-data.interface';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SignupUserDto } from './dtos/signup-user.dto';
import { UsersService } from './providers/users.service';
import { PaginationQueryDto } from '@/common/pagination/dtos/pagination-query.dto';
import { UpdateCurrentUserDto } from './dtos/update-current-user.dto';
import { Auth } from '@/auths/decorators/auth.decorator';
import { AuthType } from '@/auths/enums/auth-type.enum';

@UseInterceptors(ClassSerializerInterceptor)
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Signup a new user' })
  @ApiResponse({
    status: 201,
    description: 'User signed up successfully',
  })
  @ApiBody({ type: SignupUserDto })
  @Auth(AuthType.None)
  @Post('signup')
  async createUser(@Body() signupUserDto: SignupUserDto) {
    return await this.usersService.signupUser(signupUserDto);
  }

  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiBody({ type: UpdateCurrentUserDto })
  @ApiBearerAuth()
  @Put('update-user/:id')
  async updateUser(
    @Body() updateUserDto: UpdateCurrentUserDto,
    @ActiveUser() activeUser: ActiveUserData,
  ) {
    return await this.usersService.updateCurrentUser(updateUserDto, activeUser);
  }

  @ApiOperation({ summary: 'Get Current User' })
  @ApiResponse({
    status: 200,
    description: 'Current user retrieved successfully',
  })
  @ApiBearerAuth()
  @Get('get-current-user')
  async getUserById(@ActiveUser() activeUser: ActiveUserData) {
    return await this.usersService.findById(activeUser.id, []);
  }
}
