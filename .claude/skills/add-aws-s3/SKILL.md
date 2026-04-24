---
name: add-aws-s3
description: >-
  Adds AWS SDK and S3 file uploads module to the NestJS project. Installs
  packages, creates config, env validation, uploads module with service, and
  wires everything into app.module. Use when the user asks to add AWS, S3,
  file uploads, or cloud storage to the project.
---

# Add AWS S3

Full turnkey setup for AWS S3 file uploads. Follow every step in order.

## Step 1: Install packages

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

## Step 2: Create `src/config/aws.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export interface AwsConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  s3Endpoint?: string;
}

export default registerAs(
  'aws',
  (): AwsConfig => ({
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucketName: process.env.AWS_S3_BUCKET_NAME || '',
    s3Endpoint: process.env.AWS_S3_ENDPOINT || undefined,
  }),
);
```

## Step 3: Update `src/config/env.validation.ts`

Add these entries to the Joi object (before the closing `});`):

```typescript
  /* AWS configuration */
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET_NAME: Joi.string().required(),
  AWS_S3_ENDPOINT: Joi.string().optional(),
```

## Step 4: Append to the active env file

Add these lines to `.env.development` (or whichever env file is active):

```
#AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
AWS_S3_ENDPOINT=
```

## Step 5: Create the uploads module

### `src/uploads/uploads.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { UploadsService } from './providers/uploads.service';

@Module({
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
```

### `src/uploads/providers/uploads.service.ts`

```typescript
import { handleError } from '@/common/error-handlers/error.handler';
import { AwsConfig } from '@/config/aws.config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService implements OnModuleInit {
  private s3: S3Client;
  private bucket: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const aws = this.configService.get<AwsConfig>('aws');
    this.bucket = aws.bucketName;

    const config: ConstructorParameters<typeof S3Client>[0] = {
      region: aws.region,
      credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
      },
    };

    if (aws.s3Endpoint) {
      config.endpoint = aws.s3Endpoint;
      config.forcePathStyle = true;
    }

    this.s3 = new S3Client(config);
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ) {
    try {
      const key = `${folder}/${uuidv4()}-${file.originalname}`;

      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      return { key };
    } catch (err) {
      handleError(err);
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600) {
    try {
      const url = await getSignedUrl(
        this.s3,
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        { expiresIn },
      );
      return { url };
    } catch (err) {
      handleError(err);
    }
  }

  async deleteFile(key: string) {
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return { deleted: true };
    } catch (err) {
      handleError(err);
    }
  }
}
```

**Note:** The service uses `uuid` for unique file keys. If `uuid` is not already installed, also run:

```bash
npm install uuid && npm install -D @types/uuid
```

## Step 6: Wire into `src/app.module.ts`

1. Add the import at the top of the file:

```typescript
import awsConfig from './config/aws.config';
import { UploadsModule } from './uploads/uploads.module';
```

2. Add `awsConfig` to the `load` array in `ConfigModule.forRoot`:

```typescript
load: [databaseConfig, appConfig, mailConfig, awsConfig],
```

3. Add `UploadsModule` to the `imports` array (after existing modules):

```typescript
UploadsModule,
```

## Verification

After completing all steps, run:

```bash
npm run build
```

Confirm zero errors before finishing.
