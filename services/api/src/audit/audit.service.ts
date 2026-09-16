import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum AuditAction {
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER',
  RISK_CONFIG_UPDATED = 'RISK_CONFIG_UPDATED',
  BROKER_ADDED = 'BROKER_ADDED',
  BROKER_DELETED = 'BROKER_DELETED',
  MANUAL_ORDER = 'MANUAL_ORDER'
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logEvent(userId: string | null, action: AuditAction, metadata?: any, correlationId?: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          metadata: metadata || {},
          correlationId: correlationId || null,
        }
      });
      this.logger.log(`Audit: [${action}] User: ${userId || 'SYSTEM'}`);
    } catch (e) {
      this.logger.error(`Failed to write audit log for action ${action}`, e);
    }
  }
}
