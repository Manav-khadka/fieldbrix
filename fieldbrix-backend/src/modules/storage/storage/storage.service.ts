import { Injectable, OnModuleDestroy, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly bucket = process.env.S3_BUCKET ?? 'fieldbrix-local-uploads';
  private readonly client = new S3Client({ region: process.env.AWS_REGION ?? 'ap-south-1', endpoint: process.env.S3_ENDPOINT || undefined, forcePathStyle: Boolean(process.env.S3_ENDPOINT) });
  private readonly allowedMime = new Set(['image/jpeg', 'image/png', 'application/pdf']);
  createKey(tenantId: string, filename: string) { return `${tenantId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`; }
  validate(mime: string, size: number) { if (!this.allowedMime.has(mime)) throw new UnsupportedMediaTypeException('UNSUPPORTED_MIME'); if (!Number.isSafeInteger(size) || size < 1 || size > 25 * 1024 * 1024) throw new PayloadTooLargeException('FILE_TOO_LARGE'); }
  async put(key: string, body: Uint8Array, mime: string) { this.validate(mime, body.byteLength); await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mime, ServerSideEncryption: 'AES256' })); return { bucket: this.bucket, key }; }
  async presignPut(key: string, mime: string, size: number, checksum: string, expiresIn = 900) { this.validate(mime, size); if (!Number.isInteger(expiresIn) || expiresIn < 60 || expiresIn > 900) throw new Error('INVALID_PRESIGN_EXPIRY'); const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mime, ContentLength: size, ChecksumSHA256: checksum, ServerSideEncryption: 'AES256' }); return { url: await getSignedUrl(this.client, command, { expiresIn }), method: 'PUT' as const, headers: { 'content-type': mime, 'content-length': String(size), 'x-amz-checksum-sha256': checksum, 'x-amz-server-side-encryption': 'AES256' }, expiresIn }; }
  readiness() { return { configured: Boolean(this.bucket), bucket: this.bucket }; }
  onModuleDestroy() { this.client.destroy(); }
}
