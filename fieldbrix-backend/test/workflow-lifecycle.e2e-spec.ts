import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const SEEDED_EMAIL = 'admin@fieldbrix.local';
const SEEDED_PASSWORD = 'ChangeMe123!';
const SEEDED_ADMIN_ID = '22222222-2222-4222-8222-222222222222';

type Envelope<T> = { data: T; error?: { code: string; message: string } };

describe('Workflow lifecycle -> task creation (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let customerId: string;
  let siteId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: SEEDED_EMAIL, password: SEEDED_PASSWORD });
    token = (login.body as Envelope<{ accessToken: string }>).data.accessToken;

    const customer = await request(app.getHttpServer())
      .post('/customers')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({
        name: 'Workflow Test Customer',
        code: `WFC-${randomUUID().slice(0, 8)}`,
      });
    customerId = (customer.body as Envelope<{ id: string }>).data.id;

    const site = await request(app.getHttpServer())
      .post('/sites')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({
        name: 'Workflow Test Site',
        code: `WFS-${randomUUID().slice(0, 8)}`,
        customerId,
      });
    siteId = (site.body as Envelope<{ id: string }>).data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPublishedWorkflow(): Promise<{
    workflowId: string;
    versionId: string;
  }> {
    const created = await request(app.getHttpServer())
      .post('/workflows')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: `Test workflow ${randomUUID().slice(0, 8)}` });
    const workflow = (
      created.body as Envelope<{ id: string; revision: number }>
    ).data;

    const withSection = await request(app.getHttpServer())
      .post(`/workflows/${workflow.id}/sections`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ title: 'Arrival' });
    expect(withSection.status).toBe(201);
    const afterSection = (withSection.body as Envelope<{ revision: number }>)
      .data;

    const withField = await request(app.getHttpServer())
      .post(`/workflows/${workflow.id}/fields`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ key: 'arrival_note', type: 'TEXT', label: 'Arrival note' });
    expect(withField.status).toBe(201);
    const afterField = (withField.body as Envelope<{ revision: number }>).data;
    void afterSection;

    const published = await request(app.getHttpServer())
      .post(`/workflows/${workflow.id}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ notes: 'v1', revision: afterField.revision });
    expect(published.status).toBe(201);
    const version = (published.body as Envelope<{ id: string }>).data;
    return { workflowId: workflow.id, versionId: version.id };
  }

  it('creates a task against a published version', async () => {
    const { versionId } = await createPublishedWorkflow();
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({
        workflowVersionId: versionId,
        customerId,
        siteId,
        description: 'First visit',
      });
    expect(task.status).toBe(201);
    const created = (
      task.body as Envelope<{ id: string; number: string; status: string }>
    ).data;
    expect(created.number).toMatch(/^FBX-/);
    expect(created.status).toBe('DRAFT');

    // Assignment used to be invisible in the audit timeline — no
    // task_history row was ever written for it, unlike every other task
    // mutation.
    const assigned = await request(app.getHttpServer())
      .post(`/tasks/${created.id}/assignments`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({
        workerId: SEEDED_ADMIN_ID,
        lead: true,
        reason: 'first assignment',
      });
    expect(assigned.status).toBe(201);

    const history = await request(app.getHttpServer())
      .get(`/tasks/${created.id}/history`)
      .set('Authorization', `Bearer ${token}`);
    const historyEntries = (
      history.body as Envelope<Array<{ event: string; reason?: string }>>
    ).data;
    expect(
      historyEntries.some(
        (h) => h.event === 'TASK_ASSIGNED' && h.reason === 'first assignment',
      ),
    ).toBe(true);

    const current = await request(app.getHttpServer())
      .get(`/tasks/${created.id}/assignments`)
      .set('Authorization', `Bearer ${token}`);
    expect(current.status).toBe(200);
    const currentAssignment = (
      current.body as Envelope<{ workerId: string; lead: boolean } | null>
    ).data;
    expect(currentAssignment?.workerId).toBe(SEEDED_ADMIN_ID);
    expect(currentAssignment?.lead).toBe(true);
  });

  it('returns null for a task with no current assignment', async () => {
    const { versionId } = await createPublishedWorkflow();
    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ workflowVersionId: versionId, customerId, siteId });
    const taskId = (task.body as Envelope<{ id: string }>).data.id;

    const current = await request(app.getHttpServer())
      .get(`/tasks/${taskId}/assignments`)
      .set('Authorization', `Bearer ${token}`);
    expect(current.status).toBe(200);
    expect((current.body as Envelope<null>).data).toBeNull();
  });

  it('blocks new task creation once the source workflow is archived, but the version stays resolvable', async () => {
    const { workflowId, versionId } = await createPublishedWorkflow();
    const beforeArchive = await request(app.getHttpServer())
      .get(`/workflows/${workflowId}`)
      .set('Authorization', `Bearer ${token}`);
    const { revision } = (beforeArchive.body as Envelope<{ revision: number }>)
      .data;

    const archived = await request(app.getHttpServer())
      .post(`/workflows/${workflowId}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ reason: 'superseded', revision });
    expect(archived.status).toBe(201);

    const blockedTask = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({
        workflowVersionId: versionId,
        customerId,
        siteId,
        description: 'Should be blocked',
      });
    expect(blockedTask.status).toBe(400);

    // The version itself must remain readable for any task pinned to it before the archive.
    const version = await request(app.getHttpServer())
      .get(`/workflow-versions/${versionId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(version.status).toBe(200);
  });

  it('lists versions, resolves the template catalogue, and creates a task through the full HTTP surface', async () => {
    const { workflowId, versionId } = await createPublishedWorkflow();

    const versions = await request(app.getHttpServer())
      .get(`/workflows/${workflowId}/versions`)
      .set('Authorization', `Bearer ${token}`);
    expect(versions.status).toBe(200);
    const versionList = (versions.body as Envelope<Array<{ id: string }>>).data;
    expect(versionList.some((v) => v.id === versionId)).toBe(true);

    const templates = await request(app.getHttpServer())
      .get('/platform/workflow-templates')
      .set('Authorization', `Bearer ${token}`);
    expect(templates.status).toBe(200);

    const task = await request(app.getHttpServer())
      .post('/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({
        workflowVersionId: versionId,
        customerId,
        siteId,
        description: 'Attachment check',
      });
    expect(task.status).toBe(201);
    const taskId = (task.body as Envelope<{ id: string }>).data.id;

    // A non-existent uploadId must be rejected as a client error, not crash
    // the request — this used to 500 because the FK-violation error from
    // `task_attachments_upload_fk` was never mapped to an HTTP exception.
    const badAttachment = await request(app.getHttpServer())
      .post(`/tasks/${taskId}/attachments`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ uploadId: randomUUID(), category: 'before_photo' });
    expect(badAttachment.status).toBe(400);
  });

  const PLATFORM_ADMIN_TOKEN =
    process.env.PLATFORM_ADMIN_TOKEN ?? 'local-platform-admin';
  const PLATFORM_ADMIN_ID = '66666666-6666-4666-8666-666666666666';

  it('rejects template authoring for a tenant user but allows it for a platform admin, and instantiate copies the schema', async () => {
    const forbidden = await request(app.getHttpServer())
      .post('/platform/workflow-templates')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: 'Should be forbidden' });
    expect(forbidden.status).toBe(403);

    const created = await request(app.getHttpServer())
      .post('/platform/workflow-templates')
      .set('x-platform-admin-token', PLATFORM_ADMIN_TOKEN)
      .set('x-platform-admin-id', PLATFORM_ADMIN_ID)
      .set('idempotency-key', randomUUID())
      .send({
        name: `Quarterly inspection ${randomUUID().slice(0, 8)}`,
        category: 'Maintenance',
      });
    expect(created.status).toBe(201);
    const template = (
      created.body as Envelope<{ id: string; revision: number }>
    ).data;

    const updated = await request(app.getHttpServer())
      .patch(`/platform/workflow-templates/${template.id}`)
      .set('x-platform-admin-token', PLATFORM_ADMIN_TOKEN)
      .set('x-platform-admin-id', PLATFORM_ADMIN_ID)
      .send({
        revision: template.revision,
        schema: {
          sections: [{ id: 'sec-1', title: 'Checklist' }],
          fields: [
            {
              id: 'f-1',
              key: 'checked',
              type: 'BOOLEAN',
              label: 'Checked',
              sectionId: 'sec-1',
            },
          ],
          rules: [],
        },
      });
    expect(updated.status).toBe(200);

    const catalogue = await request(app.getHttpServer())
      .get('/platform/workflow-templates')
      .set('Authorization', `Bearer ${token}`);
    const catalogueEntry = (
      catalogue.body as Envelope<Array<{ id: string; fieldCount: number }>>
    ).data.find((item) => item.id === template.id);
    expect(catalogueEntry?.fieldCount).toBe(1);

    const instantiated = await request(app.getHttpServer())
      .post(`/platform/workflow-templates/${template.id}/instantiate`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({});
    expect(instantiated.status).toBe(201);
    const draftId = (instantiated.body as Envelope<{ id: string }>).data.id;

    const draftDetail = await request(app.getHttpServer())
      .get(`/workflows/${draftId}`)
      .set('Authorization', `Bearer ${token}`);
    const draftSchema = (
      draftDetail.body as Envelope<{
        schema: { fields: Array<{ key: string }> };
      }>
    ).data.schema;
    // Instantiate must copy the template's schema, not just its name/description.
    expect(draftSchema.fields.some((f) => f.key === 'checked')).toBe(true);
  });

  it('duplicate() copies sections/fields with fresh IDs, not just name/description', async () => {
    const created = await request(app.getHttpServer())
      .post('/workflows')
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ name: `Source workflow ${randomUUID().slice(0, 8)}` });
    const workflow = (created.body as Envelope<{ id: string }>).data;

    await request(app.getHttpServer())
      .post(`/workflows/${workflow.id}/sections`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ title: 'Safety check' });
    await request(app.getHttpServer())
      .post(`/workflows/${workflow.id}/fields`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({ key: 'ppe_worn', type: 'BOOLEAN', label: 'PPE worn?' });

    const duplicated = await request(app.getHttpServer())
      .post(`/workflows/${workflow.id}/duplicate`)
      .set('Authorization', `Bearer ${token}`)
      .set('idempotency-key', randomUUID())
      .send({});
    expect(duplicated.status).toBe(201);
    const copy = (duplicated.body as Envelope<{ id: string }>).data;

    const copyDetail = await request(app.getHttpServer())
      .get(`/workflows/${copy.id}`)
      .set('Authorization', `Bearer ${token}`);
    const schema = (
      copyDetail.body as Envelope<{
        schema: {
          sections: Array<{ title: string }>;
          fields: Array<{ key: string }>;
        };
      }>
    ).data.schema;
    expect(schema.sections.some((s) => s.title === 'Safety check')).toBe(true);
    expect(schema.fields.some((f) => f.key === 'ppe_worn')).toBe(true);
  });
});
