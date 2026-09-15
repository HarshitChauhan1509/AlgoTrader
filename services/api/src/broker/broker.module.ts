import { Module, Global } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { BrokerController } from './broker.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [BrokerService],
  controllers: [BrokerController],
  exports: [BrokerService],
})
export class BrokerModule {}
