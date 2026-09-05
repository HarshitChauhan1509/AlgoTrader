import { Module } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [RedisModule, PrismaModule],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
