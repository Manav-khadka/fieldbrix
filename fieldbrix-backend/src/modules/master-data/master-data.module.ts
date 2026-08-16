import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { PlatformModule } from '../platform/platform.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { StorageModule } from '../storage/storage.module';
import { TenantContextModule } from '../tenant-context/tenant-context.module';
import { CustomersController } from './customers/customers.controller';
import { CustomersService } from './customers/customers.service';
import { CustomersRepository } from './customers/customers.repository';
import { SitesController } from './sites/sites.controller';
import { SitesService } from './sites/sites.service';
import { SitesRepository } from './sites/sites.repository';
import { ServiceTargetsController } from './service-targets/service-targets.controller';
import { ServiceTargetsService } from './service-targets/service-targets.service';
import { ServiceTargetsRepository } from './service-targets/service-targets.repository';
import { QrIdentityService } from './service-targets/qr-identity.service';
import { PartsController } from './parts/parts.controller';
import { PartsService } from './parts/parts.service';
import { PartsRepository } from './parts/parts.repository';
import { ImportsController } from './imports/imports.controller';
import { ImportsService } from './imports/imports.service';
import { ImportsRepository } from './imports/imports.repository';
import { ImportProcessorService } from './imports/import-processor.service';
import { SpreadsheetParserService } from './imports/spreadsheet-parser.service';

@Module({
  imports: [
    DatabaseModule,
    AuthorizationModule,
    PlatformModule,
    IdempotencyModule,
    StorageModule,
    TenantContextModule,
  ],
  controllers: [
    CustomersController,
    SitesController,
    ServiceTargetsController,
    PartsController,
    ImportsController,
  ],
  providers: [
    CustomersService,
    CustomersRepository,
    SitesService,
    SitesRepository,
    ServiceTargetsService,
    ServiceTargetsRepository,
    QrIdentityService,
    PartsService,
    PartsRepository,
    ImportsService,
    ImportsRepository,
    ImportProcessorService,
    SpreadsheetParserService,
  ],
})
export class MasterDataModule {}
