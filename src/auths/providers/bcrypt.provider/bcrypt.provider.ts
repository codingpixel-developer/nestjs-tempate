import * as bcrypt from 'bcryptjs';

import { HashingProvider } from '../hashing.provider';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BcryptProvider implements HashingProvider {
  public async hashPassword(data: string | Buffer): Promise<string> {
    // Generate the salt
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(data.toString(), salt);
  }

  public async comparePassword(
    data: string | Buffer,
    encrypted: string,
  ): Promise<boolean> {
    return bcrypt.compare(data.toString(), encrypted);
  }
}
