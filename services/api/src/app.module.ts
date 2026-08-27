import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { appConfig, validateEnvironment } from './config/app.config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MarketDataModule } from './market-data/market-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate: validateEnvironment,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    RedisModule,
    MarketDataModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}

