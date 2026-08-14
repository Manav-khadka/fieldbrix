import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        const payload = body as {
          data: Record<string, unknown>;
          meta: { correlationId: string };
        };
        expect(payload.data).toMatchObject({
          service: 'fieldbrix-api',
          status: 'online',
        });
        expect(payload.meta.correlationId).toEqual(expect.any(String));
      });
  });

  it('/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect(
        ({
          body,
          headers,
        }: {
          body: unknown;
          headers: Record<string, string>;
        }) => {
          const payload = body as { data: unknown };
          expect(payload.data).toEqual({ status: 'live' });
          expect(headers).toHaveProperty('x-correlation-id');
        },
      );
  });

  it('/health/ready (GET) fails closed when dependencies are absent', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(503)
      .expect(({ body }: { body: unknown }) => {
        const payload = body as { error: { code: string; message: string } };
        expect(payload.error.code).toBe('DEPENDENCY_UNAVAILABLE');
        expect(payload.error.message).not.toMatch(/database|bucket|queue/i);
      });
  });

  it('/version (GET)', () => {
    return request(app.getHttpServer())
      .get('/version')
      .expect(200)
      .expect(({ body }: { body: unknown }) => {
        const payload = body as { data: Record<string, unknown> };
        expect(payload.data).toMatchObject({
          service: 'fieldbrix-api',
          buildTime: null,
        });
        expect(payload.data).toHaveProperty('version');
        expect(payload.data).toHaveProperty('commitSha');
        expect(payload.data).not.toHaveProperty('hostname');
      });
  });

  it('/debug-sentry (GET) is unavailable unless explicitly enabled', () => {
    return request(app.getHttpServer()).get('/debug-sentry').expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
