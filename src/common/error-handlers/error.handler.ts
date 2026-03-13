import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

export function handleError(error: any) {
  const status = error?.status || error?.statusCode;

  if (error instanceof HttpException) {
    // Re-throw if already an HttpException
    throw error;
  }

  switch (status) {
    case 400:
      throw new BadRequestException(error.message || 'Bad Request');
    case 401:
      throw new UnauthorizedException(error.message || 'Unauthorized');
    case 403:
      throw new ForbiddenException(error.message || 'Forbidden');
    case 404:
      throw new NotFoundException(error.message || 'Not Found');
    case 408:
      throw new RequestTimeoutException(error.message || 'Request Timeout');
    case 409:
      throw new ConflictException(error.message || 'Conflict');
    case 503:
      throw new ServiceUnavailableException(
        error.message || 'Service Unavailable',
      );
    case 504:
      throw new GatewayTimeoutException(error.message || 'Gateway Timeout');
    default:
      console.error('Unexpected Error:', error);
      throw new InternalServerErrorException(
        error?.message || 'Internal server error',
      );
  }
}
