import { Global, Module } from '@nestjs/common';
import { PaginationProvider } from './providers/pagination.provider';

@Global()
@Module({
  providers: [PaginationProvider],
  exports: [PaginationProvider],
})
export class PaginationModule {}
