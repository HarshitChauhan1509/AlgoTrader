import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrokerAdapter } from './broker.adapter';
import { AlpacaAdapter } from './alpaca.adapter';
import { ZerodhaAdapter } from './zerodha.adapter';
import { BrokerService } from '../../broker/broker.service';

@Injectable()
export class BrokerAdapterFactory {
  private readonly logger = new Logger(BrokerAdapterFactory.name);
  private adapters = new Map<string, BrokerAdapter>(); // Cache by brokerAccountId

  constructor(
    private readonly configService: ConfigService,
    private readonly brokerService: BrokerService,
  ) {}

  async getAdapterForUser(userId: string, brokerName: string = 'alpaca'): Promise<BrokerAdapter> {
    const cacheKey = `${userId}:${brokerName}`;
    if (this.adapters.has(cacheKey)) {
      return this.adapters.get(cacheKey)!;
    }

    // Attempt to fetch credentials from DB
    const credentials = await this.brokerService.getDecryptedCredentials(userId, brokerName);
    
    if (brokerName === 'alpaca') {
      const adapter = new AlpacaAdapter(this.configService, credentials);
      this.adapters.set(cacheKey, adapter);
      return adapter;
    }

    if (brokerName === 'zerodha') {
      const adapter = new ZerodhaAdapter();
      this.adapters.set(cacheKey, adapter);
      return adapter;
    }

    throw new Error(`Unsupported broker: ${brokerName}`);
  }
}
