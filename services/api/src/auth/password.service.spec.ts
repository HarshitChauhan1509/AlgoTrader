import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/app.config';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, number> = {
        'passwordHash.memoryCost': 8192,
        'passwordHash.timeCost': 2,
        'passwordHash.parallelism': 1,
      };

      return values[key];
    }),
  } as unknown as ConfigService<AppConfig, true>;

  it('hashes and verifies a password', async () => {
    const service = new PasswordService(config);
    const hash = await service.hash('correct-horse-battery-staple');

    await expect(service.verify(hash, 'correct-horse-battery-staple')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });
});

