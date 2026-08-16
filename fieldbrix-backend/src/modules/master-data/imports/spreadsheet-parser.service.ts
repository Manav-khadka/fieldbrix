import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { read, utils, type WorkSheet } from 'xlsx';
import { StorageService } from '../../storage/storage/storage.service';
import { PlatformRepository } from '../../platform/platform.repository/platform.repository';

const MAX_ROWS = 5000;
const MAX_COLUMNS = 200;
const ALLOWED_MIME = new Set([
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
/** Leading characters Excel/Sheets/LibreOffice treat as the start of a
 * formula — the classic CSV-injection vector (OWASP: neutralize, don't
 * reject, since legitimate data can start with e.g. "-5"). */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function neutralizeCell(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

function cellToHeaderName(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'string') return cell.trim();
  if (typeof cell === 'number' || typeof cell === 'boolean')
    return String(cell).trim();
  if (cell instanceof Date) return cell.toISOString().trim();
  return '';
}

/**
 * Parses a previously-uploaded CSV/XLSX file (via the existing files/
 * upload-intent flow) into row objects keyed by header name, applying
 * row/column limits and formula-injection neutralization before any row
 * reaches validation. Never accepts raw bytes over HTTP directly — the
 * file must already exist in S3-compatible storage under the tenant's
 * files record, giving the same size/MIME gate every other upload goes
 * through.
 */
@Injectable()
export class SpreadsheetParserService {
  constructor(
    private readonly storage: StorageService,
    private readonly platformRepository: PlatformRepository,
  ) {}

  async parseUpload(
    uploadId: string,
    tenantId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const file = await this.platformRepository.findFile(uploadId, tenantId);
    if (!file || file.status !== 'COMPLETED')
      throw new BadRequestException('UPLOAD_NOT_FOUND');
    if (!ALLOWED_MIME.has(file.mime))
      throw new BadRequestException('UNSUPPORTED_IMPORT_FILE_TYPE');

    const { body } = await this.storage.get(file.key);
    return this.parseBytes(body);
  }

  parseBytes(bytes: Uint8Array): Array<Record<string, unknown>> {
    let workbook: ReturnType<typeof read>;
    try {
      workbook = read(bytes, {
        type: 'buffer',
        cellFormula: false, // never evaluate embedded formulas
        cellHTML: false,
      });
    } catch {
      throw new BadRequestException('UNREADABLE_SPREADSHEET');
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('EMPTY_SPREADSHEET');
    return this.sheetToRows(workbook.Sheets[sheetName]);
  }

  private sheetToRows(sheet: WorkSheet): Array<Record<string, unknown>> {
    // `header: 1` returns a 2D array of raw cell values — the shape needed
    // to enforce header/row limits and neutralization before any field-name
    // mapping happens.
    const matrix = utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: null,
    });
    if (matrix.length === 0) return [];

    const header = matrix[0].map((cell) => cellToHeaderName(cell));
    if (header.length > MAX_COLUMNS)
      throw new BadRequestException('TOO_MANY_COLUMNS');
    const nonEmptyHeaders = header.filter(Boolean);
    if (new Set(nonEmptyHeaders).size !== nonEmptyHeaders.length)
      throw new BadRequestException('DUPLICATE_HEADER_COLUMN');

    const dataRows = matrix.slice(1);
    if (dataRows.length > MAX_ROWS)
      throw new PayloadTooLargeException('IMPORT_ROW_LIMIT_EXCEEDED');

    return dataRows.map((row) => {
      const record: Record<string, unknown> = {};
      header.forEach((key, index) => {
        if (!key) return;
        record[key] = neutralizeCell(row[index]);
      });
      return record;
    });
  }
}
