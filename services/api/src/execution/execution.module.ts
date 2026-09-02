import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { ExecutionService } from './execution.service';

@Module({
  imports: [RedisModule],
  providers: [ExecutionService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
