import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RiskController } from './risk.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}

