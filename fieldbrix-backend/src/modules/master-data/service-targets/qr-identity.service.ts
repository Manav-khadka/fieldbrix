import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

const FORMAT = /^fbx1\.([a-f0-9]{32})\.([a-f0-9]{8})$/i;

/**
 * QR identities carry a random, non-guessable nonce plus a truncated HMAC
 * checksum keyed by a server-side secret — the checksum authenticates that
 * the payload was minted by this server (not merely well-formed) without
 * ever encoding tenant/customer identifiers in the payload itself.
 */
@Injectable()
export class QrIdentityService {
  constructor(private readonly config: ConfigService) {}

  private secret(): string {
    return this.config.get<string>(
      'QR_SIGNING_SECRET',
      'fieldbrix-local-qr-secret',
    );
  }

  generate(): string {
    const nonce = randomUUID().replaceAll('-', '');
    const prefix = `fbx1.${nonce}`;
    const checksum = createHmac('sha256', this.secret())
      .update(prefix)
      .digest('hex')
      .slice(0, 8);
    return `${prefix}.${checksum}`;
  }

  isValid(code: string): boolean {
    const match = FORMAT.exec(code);
    if (!match) return false;
    const expected = createHmac('sha256', this.secret())
      .update(`fbx1.${match[1]}`)
      .digest('hex')
      .slice(0, 8);
    const provided = match[2].toLowerCase();
    if (expected.length !== provided.length) return false;
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  }
}
