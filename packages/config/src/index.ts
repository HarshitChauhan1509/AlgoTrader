export interface RuntimeConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  redisUrl: string;
  corsOrigins: string[];
}

