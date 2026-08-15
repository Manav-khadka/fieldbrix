import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const SEEDED_EMAIL = 'admin@fieldbrix.local';
const SEEDED_PASSWORD = 'ChangeMe123!';

type Envelope<T> = { data: T; error?: { code: string; message: string } };

describe('Master data (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: SEEDED_EMAIL, password: SEEDED_PASSWORD });
    expect(login.status).toBe(201);
    token = (login.body as Envelope<{ accessToken: string }>).data.accessToken;
    expect(typeof token).toBe('string');
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a customer, rejects a duplicate code, and paginates the list', async () => {
    const code = `CUST-${randomUUID().slice(0, 8)}`;
    const created = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: 'Al Noor Facilities', code, email: 'ops@alnoor.example' });
    expect(created.status).toBe(201);
    const customer = (created.body as Envelope<{ id: string; code: string; revision: number }>).data;
    expect(customer.code).toBe(code);
    expect(customer.revision).toBe(1);

    const duplicate = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: 'Duplicate', code });
    expect(duplicate.status).toBe(409);

    const list = await request(app.getHttpServer())
      .get('/customers')
      .query({ search: code, page: 1, limit: 10 })
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    const page = (list.body as Envelope<{ items: Array<{ code: string }>; total: number }>).data;
    expect(page.items.some((item) => item.code === code)).toBe(true);
  });

  it('rejects a site referencing an unknown customer', async () => {
    const response = await request(app.getHttpServer())
      .post('/sites')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: 'Orphan Site', code: `SITE-${randomUUID().slice(0, 8)}`, customerId: randomUUID() });
    expect(response.status).toBe(400);
  });

  it('builds customer -> site -> service target and resolves the QR identity', async () => {
    const customerCode = `CUST-${randomUUID().slice(0, 8)}`;
    const customer = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: 'Gulf Hospitality Group', code: customerCode });
    const customerId = (customer.body as Envelope<{ id: string }>).data.id;

    const site = await request(app.getHttpServer())
      .post('/sites')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: 'Gulf Bay Hotel', code: `SITE-${randomUUID().slice(0, 8)}`, customerId });
    expect(site.status).toBe(201);
    const siteId = (site.body as Envelope<{ id: string }>).data.id;

    const target = await request(app.getHttpServer())
      .post('/service-targets')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: 'Chiller Plant A', code: `AST-${randomUUID().slice(0, 8)}`, siteId, equipmentType: 'HVAC' });
    expect(target.status).toBe(201);
    const created = (target.body as Envelope<{ id: string; qrIdentity: string; siteId: string }>).data;
    expect(created.siteId).toBe(siteId);
    expect(created.qrIdentity).toMatch(/^fbx1\.[a-f0-9]{32}\.[a-f0-9]{8}$/);

    const resolved = await request(app.getHttpServer())
      .get(`/qr-identities/${created.qrIdentity}/resolve`)
      .set('Authorization', `Bearer ${token}`);
    expect(resolved.status).toBe(200);
    const resolution = (resolved.body as Envelope<{ target: { id: string }; site: { id: string; customerId: string } }>).data;
    expect(resolution.target.id).toBe(created.id);
    expect(resolution.site.customerId).toBe(customerId);

    const forged = await request(app.getHttpServer())
      .get('/qr-identities/fbx1.00000000000000000000000000000000.deadbeef/resolve')
      .set('Authorization', `Bearer ${token}`);
    expect(forged.status).toBe(404);
  });

  it('rejects an archive attempt while the customer still has an active site', async () => {
    const customerCode = `CUST-${randomUUID().slice(0, 8)}`;
    const customer = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: 'With Active Site', code: customerCode });
    const customerId = (customer.body as Envelope<{ id: string }>).data.id;
    await request(app.getHttpServer())
      .post('/sites')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: 'Only Site', code: `SITE-${randomUUID().slice(0, 8)}`, customerId });

    const archiveAttempt = await request(app.getHttpServer())
      .patch(`/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ archived: true, revision: 1 });
    expect(archiveAttempt.status).toBe(409);
  });

  it('previews and commits a customer import with mixed valid/invalid rows and partial success', async () => {
    const validCode = `IMP-${randomUUID().slice(0, 8)}`;
    const preview = await request(app.getHttpServer())
      .post('/imports/preview')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({
        entityType: 'customers',
        duplicateMode: 'reject',
        rows: [
          { name: 'Valid Row', code: validCode },
          { name: '', code: '' },
        ],
      });
    expect(preview.status).toBe(201);
    const job = (preview.body as Envelope<{ id: string; totalRows: number; validRows: number; errorRows: number; previewRevision: number }>).data;
    expect(job.totalRows).toBe(2);
    expect(job.validRows).toBe(1);
    expect(job.errorRows).toBe(1);

    const commit = await request(app.getHttpServer())
      .post(`/imports/${job.id}/commit`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ previewRevision: job.previewRevision });
    expect(commit.status).toBe(201);
    const completed = (commit.body as Envelope<{ status: string; validRows: number; errorRows: number }>).data;
    expect(completed.status).toBe('PARTIAL');
    expect(completed.validRows).toBe(1);
    expect(completed.errorRows).toBe(1);

    const created = await request(app.getHttpServer())
      .get('/customers')
      .query({ search: validCode })
      .set('Authorization', `Bearer ${token}`);
    const page = (created.body as Envelope<{ items: Array<{ code: string }> }>).data;
    expect(page.items.some((item) => item.code === validCode)).toBe(true);
  });
});
