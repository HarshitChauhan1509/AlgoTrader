import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { appConfig, validateEnvironment } from './config/app.config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MarketDataModule } from './market-data/market-data.module';
import { StrategyEngineModule } from './strategy-engine/strategy-engine.module';
import { ExecutionModule } from './execution/execution.module';
import { RiskModule } from './risk/risk.module';
import { GatewayModule } from './gateway/gateway.module';
import { PortfolioModule } from './portfolio/portfolio.module';

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
    StrategyEngineModule,
    ExecutionModule,
    RiskModule,
    GatewayModule,
    PortfolioModule,
    HealthModule,
    AuthModule,
  ],
})
export class AppModule {}






