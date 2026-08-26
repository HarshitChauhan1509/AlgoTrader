import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().min(1).default('api'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  PASSWORD_HASH_MEMORY_COST: z.coerce.number().int().positive().default(19456),
  PASSWORD_HASH_TIME_COST: z.coerce.number().int().positive().default(2),
  PASSWORD_HASH_PARALLELISM: z.coerce.number().int().positive().default(1),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
});

export type EnvironmentVariables = z.infer<typeof envSchema>;

export interface AppConfig {
  nodeEnv: EnvironmentVariables['NODE_ENV'];
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  redisUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  passwordHash: {
    memoryCost: number;
    timeCost: number;
    parallelism: number;
  };
  corsOrigins: string[];
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  return envSchema.parse(config);
}

export const appConfig = registerAs('app', (): AppConfig => {
  const env = validateEnvironment(process.env);

  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },
    passwordHash: {
      memoryCost: env.PASSWORD_HASH_MEMORY_COST,
      timeCost: env.PASSWORD_HASH_TIME_COST,
      parallelism: env.PASSWORD_HASH_PARALLELISM,
    },
    corsOrigins: env.CORS_ORIGINS.split(',').map((origin) => origin.trim()),
  };
});

