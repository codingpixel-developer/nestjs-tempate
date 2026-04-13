import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Admin } from '../../admin/entities/admin.entity';

const env = process.env.NODE_ENV || '';
dotenv.config({
  path: path.resolve(process.cwd(), env ? `.env.${env}` : '.env'),
});

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USERNAME || 'postgres',
  password: process.env.DATABASE_PASSWORD || '1234',
  database: process.env.DATABASE_NAME || 'template',
  entities: [Admin],
  synchronize: false,
});

async function seed() {
  await dataSource.initialize();

  const adminRepo = dataSource.getRepository(Admin);

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@template.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';

  const existing = await adminRepo.findOne({ where: { email } });

  if (existing) {
    console.log(`Admin already exists: ${email}`);
    await dataSource.destroy();
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const admin = adminRepo.create({ email, password: hashed });
  await adminRepo.save(admin);

  console.log(`Admin seeded successfully: ${email}`);
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seeder failed:', err);
  process.exit(1);
});
