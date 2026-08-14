import { Injectable } from '@nestjs/common';

export type PdfJob = {
  jobId: string;
  tenantId: string;
  sourceKey: string;
  outputKey: string;
  templateVersion: string;
  correlationId?: string;
};

export type PdfJobResult = {
  jobId: string;
  status: 'accepted';
  outputKey: string;
};

@Injectable()
export class PdfWorkerService {
  submit(job: PdfJob): PdfJobResult {
    if (
      !job.jobId ||
      !job.tenantId ||
      !job.sourceKey ||
      !job.outputKey ||
      !job.templateVersion
    )
      throw new Error('INVALID_PDF_JOB');
    return { jobId: job.jobId, status: 'accepted', outputKey: job.outputKey };
  }
}
