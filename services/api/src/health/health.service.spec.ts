import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports dependencies as up when database and redis respond', async () => {
    const service = new HealthService(
      { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as any,
      { ping: jest.fn().mockResolvedValue('PONG') } as any,
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'up',
      dependencies: {
        database: 'up',
        redis: 'up',
      },
    });
  });

  it('degrades when a dependency is unavailable', async () => {
    const service = new HealthService(
      { $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')) } as any,
      { ping: jest.fn().mockResolvedValue('PONG') } as any,
    );

    await expect(service.check()).resolves.toMatchObject({
      status: 'down',
      dependencies: {
        database: 'down',
        redis: 'up',
      },
    });
  });
});
