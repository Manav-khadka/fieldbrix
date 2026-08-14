import { Module } from '@nestjs/common';
import { PdfWorkerService } from './pdf-worker.service';

@Module({
  providers: [PdfWorkerService],
  exports: [PdfWorkerService],
})
export class PdfWorkerModule {}
