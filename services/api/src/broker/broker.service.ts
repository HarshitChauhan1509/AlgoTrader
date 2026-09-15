import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BrokerService {
  private readonly logger = new Logger(BrokerService.name);
  private readonly encryptionKey: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    // In production, this should be a strong 32-byte key from env
    const secret = this.config.get<string>('ENCRYPTION_SECRET', 'super-secret-key-that-is-at-least-32-bytes-long');
    this.encryptionKey = crypto.scryptSync(secret, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  public decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new BadRequestException('Invalid encrypted data format');
    
    const [ivHex, encryptedHex, authTagHex] = parts;
    const iv = Buffer.from(ivHex as string, 'hex');
    const authTag = Buffer.from(authTagHex as string, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex as string, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async getBrokerAccounts(userId: string) {
    const accounts = await this.prisma.brokerAccount.findMany({
      where: { userId },
      select: {
        id: true,
        broker: true,
        displayName: true,
        connectedAt: true,
        createdAt: true,
      } // Exclude encryptedCredentials for security in the listing
    });
    return accounts;
  }

  async addOrUpdateBroker(userId: string, dto: { broker: string, displayName: string, credentials: any }) {
    this.logger.log(`Adding broker ${dto.broker} for user ${userId}`);
    
    const encrypted = this.encrypt(JSON.stringify(dto.credentials));

    return this.prisma.brokerAccount.upsert({
      where: {
        userId_broker: {
          userId,
          broker: dto.broker,
        }
      },
      update: {
        displayName: dto.displayName,
        encryptedCredentials: encrypted,
        connectedAt: new Date(),
      },
      create: {
        userId,
        broker: dto.broker,
        displayName: dto.displayName,
        encryptedCredentials: encrypted,
        connectedAt: new Date(),
      }
    });
  }

  async deleteBroker(userId: string, id: string) {
    return this.prisma.brokerAccount.delete({
      where: { id, userId },
    });
  }

  /**
   * Used internally by ExecutionEngine to get decrypted keys
   */
  async getDecryptedCredentials(userId: string, broker: string): Promise<any> {
    const account = await this.prisma.brokerAccount.findUnique({
      where: { userId_broker: { userId, broker } }
    });

    if (!account || !account.encryptedCredentials) {
      return null;
    }

    try {
      const decrypted = this.decrypt(account.encryptedCredentials as string);
      return JSON.parse(decrypted);
    } catch (e) {
      this.logger.error(`Failed to decrypt credentials for user ${userId}`, e);
      return null;
    }
  }
}
