import { utils, write } from 'xlsx';
import { SpreadsheetParserService } from './spreadsheet-parser.service';
import type { StorageService } from '../../storage/storage/storage.service';
import type { PlatformRepository } from '../../platform/platform.repository/platform.repository';

function buildXlsxBuffer(rows: unknown[][]): Uint8Array {
  const sheet = utils.aoa_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Uint8Array;
}

function service(): SpreadsheetParserService {
  const storage = {} as StorageService;
  const platformRepository = {} as PlatformRepository;
  return new SpreadsheetParserService(storage, platformRepository);
}

describe('SpreadsheetParserService.parseBytes', () => {
  it('parses a real CSV buffer into header-keyed row objects', () => {
    const csv =
      'name,code,email\nAl Noor Facilities,ALN-001,ops@alnoor.example\nGulf Group,GHG-014,\n';
    const rows = service().parseBytes(Buffer.from(csv, 'utf8'));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: 'Al Noor Facilities',
      code: 'ALN-001',
      email: 'ops@alnoor.example',
    });
    expect(rows[1].code).toBe('GHG-014');
  });

  it('parses a real XLSX workbook (round-tripped through SheetJS) into row objects', () => {
    const buffer = buildXlsxBuffer([
      ['name', 'code', 'unit'],
      ['Compressor belt 42B', 'PART-042', 'piece'],
      ['Filter cartridge', 'PART-043', 'box'],
    ]);
    const rows = service().parseBytes(buffer);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      name: 'Compressor belt 42B',
      code: 'PART-042',
      unit: 'piece',
    });
    expect(rows[1].code).toBe('PART-043');
  });

  it('neutralizes formula-injection payloads instead of evaluating or silently accepting them', () => {
    const csv = "name,code\n=cmd|'/C calc'!A1,SAFE-001\n";
    const rows = service().parseBytes(Buffer.from(csv, 'utf8'));
    expect(String(rows[0].name)).toMatch(/^'=/);
  });

  it('rejects a spreadsheet with duplicate header columns', () => {
    const buffer = buildXlsxBuffer([
      ['name', 'code', 'code'],
      ['A', '1', '2'],
    ]);
    expect(() => service().parseBytes(buffer)).toThrow(
      'DUPLICATE_HEADER_COLUMN',
    );
  });

  it('returns an empty array for a sheet with only a header row', () => {
    const buffer = buildXlsxBuffer([['name', 'code']]);
    expect(service().parseBytes(buffer)).toEqual([]);
  });

  it('rejects a corrupt file that looks like an XLSX (zip) but is not parseable', () => {
    // A real ZIP local-file-header signature followed by garbage that isn't
    // a valid compressed entry — SheetJS's zip codec rejects this outright,
    // unlike plain garbage bytes which it happily treats as a text cell.
    const corrupt = Buffer.concat([
      Buffer.from('PK\x03\x04', 'binary'),
      Buffer.from(Array.from({ length: 20 }, (_, i) => i)),
    ]);
    expect(() => service().parseBytes(corrupt)).toThrow(
      'UNREADABLE_SPREADSHEET',
    );
  });
});

describe('SpreadsheetParserService.parseUpload', () => {
  it('rejects an unknown or incomplete uploadId as a client error, not a crash', async () => {
    const storage = {} as StorageService;
    const platformRepository = {
      findFile: jest.fn().mockResolvedValue(undefined),
    } as unknown as PlatformRepository;
    const parser = new SpreadsheetParserService(storage, platformRepository);
    await expect(parser.parseUpload('missing-id', 'tenant-1')).rejects.toThrow(
      'UPLOAD_NOT_FOUND',
    );
  });

  it('rejects a completed upload whose declared MIME type is not a spreadsheet', async () => {
    const storage = {} as StorageService;
    const platformRepository = {
      findFile: jest.fn().mockResolvedValue({
        id: 'file-1',
        tenantId: 'tenant-1',
        key: 'tenant-1/file.pdf',
        mime: 'application/pdf',
        size: 100,
        checksum: 'x',
        status: 'COMPLETED',
      }),
    } as unknown as PlatformRepository;
    const parser = new SpreadsheetParserService(storage, platformRepository);
    await expect(parser.parseUpload('file-1', 'tenant-1')).rejects.toThrow(
      'UNSUPPORTED_IMPORT_FILE_TYPE',
    );
  });
});
