import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  synchronize: boolean;
  autoLoadEntities: boolean;
}

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    user: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || '1234',
    name: process.env.DATABASE_NAME || 'template',
    synchronize: process.env.DATABASE_SYNC === 'true',
    autoLoadEntities: process.env.DATABASE_AUTOLOAD === 'true',
  }),
);
