import { ImportProcessorService } from './import-processor.service';
import type { ImportableEntityType } from '../dto/import.dto';

// Lightweight stubs for the repository dependencies
const makeRepo = (overrides: Record<string, unknown> = {}) => ({
  findByCode: jest.fn().mockResolvedValue(undefined),
  create: jest.fn().mockResolvedValue({ id: 'new-id' }),
  update: jest.fn().mockResolvedValue({ id: 'existing-id' }),
  ...overrides,
});

const makeQr = () => ({ generate: jest.fn().mockReturnValue('QR-ABC123') });

function makeProcessor(repoOverrides?: {
  customers?: Record<string, unknown>;
  sites?: Record<string, unknown>;
  serviceTargets?: Record<string, unknown>;
  parts?: Record<string, unknown>;
}) {
  const customers = makeRepo(repoOverrides?.customers);
  const sites = makeRepo(repoOverrides?.sites);
  const serviceTargets = makeRepo(repoOverrides?.serviceTargets);
  const parts = makeRepo(repoOverrides?.parts);
  const qr = makeQr();
  /* eslint-disable @typescript-eslint/no-unsafe-argument */
  const processor = new ImportProcessorService(
    customers as any,
    sites as any,
    serviceTargets as any,
    parts as any,
    qr as any,
  );
  /* eslint-enable @typescript-eslint/no-unsafe-argument */
  return { processor, customers, sites, serviceTargets, parts, qr };
}

// ─── validateRow ──────────────────────────────────────────────────────────────

describe('ImportProcessorService.validateRow', () => {
  const { processor } = makeProcessor();

  describe('customers', () => {
    it('passes with name and code', () => {
      expect(
        processor.validateRow('customers', { name: 'Acme', code: 'ACM' }).valid,
      ).toBe(true);
    });
    it('fails without name', () => {
      const r = processor.validateRow('customers', { code: 'ACM' });
      expect(r.valid).toBe(false);
      expect(r.errorCode).toBe('REQUIRED_FIELD');
    });
    it('fails without code', () => {
      expect(processor.validateRow('customers', { name: 'Acme' }).valid).toBe(
        false,
      );
    });
    it('fails with empty string name', () => {
      expect(
        processor.validateRow('customers', { name: '   ', code: 'ACM' }).valid,
      ).toBe(false);
    });
  });

  describe('sites', () => {
    it('passes with name, code and customerCode', () => {
      expect(
        processor.validateRow('sites', {
          name: 'Site A',
          code: 'SA',
          customerCode: 'ACM',
        }).valid,
      ).toBe(true);
    });
    it('fails without parent reference', () => {
      const r = processor.validateRow('sites', { name: 'Site A', code: 'SA' });
      expect(r.valid).toBe(false);
      expect(r.errorCode).toBe('PARENT_REQUIRED');
    });
    it('passes with customerId instead of customerCode', () => {
      expect(
        processor.validateRow('sites', {
          name: 'S',
          code: 'S',
          customerId: 'uuid',
        }).valid,
      ).toBe(true);
    });
  });

  describe('service_targets', () => {
    it('fails without siteCode or siteId', () => {
      const r = processor.validateRow('service_targets', {
        name: 'T',
        code: 'T',
      });
      expect(r.valid).toBe(false);
      expect(r.errorCode).toBe('PARENT_REQUIRED');
    });
    it('passes with siteCode', () => {
      expect(
        processor.validateRow('service_targets', {
          name: 'T',
          code: 'T',
          siteCode: 'SA',
        }).valid,
      ).toBe(true);
    });
  });

  describe('parts', () => {
    it('requires name, code, unit', () => {
      expect(
        processor.validateRow('parts', { name: 'Bolt', code: 'BLT' }).valid,
      ).toBe(false);
      expect(
        processor.validateRow('parts', {
          name: 'Bolt',
          code: 'BLT',
          unit: 'pcs',
        }).valid,
      ).toBe(true);
    });
  });
});

// ─── commitRow ────────────────────────────────────────────────────────────────

describe('ImportProcessorService.commitRow', () => {
  describe('customers — duplicate modes', () => {
    it('creates when no duplicate found', async () => {
      const { processor, customers } = makeProcessor();
      const result = await processor.commitRow(
        'customers',
        { name: 'Acme', code: 'ACM' },
        'reject',
      );
      expect(result.outcome).toBe('CREATED');
      expect(customers.create).toHaveBeenCalledTimes(1);
    });

    it('reject mode returns ERROR for duplicate', async () => {
      const { processor } = makeProcessor({
        customers: {
          findByCode: jest.fn().mockResolvedValue({ id: 'existing' }),
        },
      });
      const result = await processor.commitRow(
        'customers',
        { name: 'Acme', code: 'ACM' },
        'reject',
      );
      expect(result.outcome).toBe('ERROR');
      if (result.outcome === 'ERROR')
        expect(result.errorCode).toBe('DUPLICATE_CODE');
    });

    it('skip mode returns SKIPPED for duplicate', async () => {
      const { processor } = makeProcessor({
        customers: {
          findByCode: jest.fn().mockResolvedValue({ id: 'existing' }),
        },
      });
      const result = await processor.commitRow(
        'customers',
        { name: 'Acme', code: 'ACM' },
        'skip',
      );
      expect(result.outcome).toBe('SKIPPED');
    });

    it('update mode returns UPDATED for duplicate', async () => {
      const { processor } = makeProcessor({
        customers: {
          findByCode: jest.fn().mockResolvedValue({ id: 'existing' }),
          update: jest.fn().mockResolvedValue({ id: 'existing' }),
        },
      });
      const result = await processor.commitRow(
        'customers',
        { name: 'Acme', code: 'ACM' },
        'update',
      );
      expect(result.outcome).toBe('UPDATED');
    });
  });

  describe('sites — parent resolution', () => {
    it('returns ERROR when customerCode not found', async () => {
      const { processor } = makeProcessor({
        customers: { findByCode: jest.fn().mockResolvedValue(undefined) },
      });
      const result = await processor.commitRow(
        'sites',
        { name: 'S', code: 'S', customerCode: 'UNKNOWN' },
        'reject',
      );
      expect(result.outcome).toBe('ERROR');
      if (result.outcome === 'ERROR')
        expect(result.errorCode).toBe('CUSTOMER_NOT_FOUND');
    });

    it('creates site when customer resolves', async () => {
      const { processor, sites } = makeProcessor({
        customers: {
          findByCode: jest.fn().mockResolvedValue({ id: 'cust-1' }),
        },
      });
      const result = await processor.commitRow(
        'sites',
        { name: 'S', code: 'S', customerCode: 'ACM' },
        'reject',
      );
      expect(result.outcome).toBe('CREATED');
      expect(sites.create).toHaveBeenCalled();
    });
  });

  describe('service_targets — QR generation', () => {
    it('generates QR identity on create', async () => {
      const { processor, qr } = makeProcessor({
        sites: { findByCode: jest.fn().mockResolvedValue({ id: 'site-1' }) },
      });
      await processor.commitRow(
        'service_targets',
        { name: 'T', code: 'T', siteCode: 'SA' },
        'reject',
      );
      expect(qr.generate).toHaveBeenCalled();
    });
  });

  describe('parts', () => {
    it('creates a new part', async () => {
      const { processor, parts } = makeProcessor();
      const result = await processor.commitRow(
        'parts',
        { name: 'Bolt', code: 'BLT', unit: 'pcs' },
        'reject',
      );
      expect(result.outcome).toBe('CREATED');
      expect(parts.create).toHaveBeenCalled();
    });
  });
});

// Satisfy unused import lint
const _: ImportableEntityType = 'customers';
void _;
