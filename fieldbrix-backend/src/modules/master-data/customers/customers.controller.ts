import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Permission } from '../../authorization/decorators/permission.decorator/permission.decorator';
import { PermissionGuard } from '../../authorization/guards/permission/permission.guard';
import { CreateCustomerDto, UpdateCustomerDto } from '../dto/customer.dto';
import { ListMasterQueryDto } from '../dto/list-master-query.dto';
import { IdempotencyService } from '../../idempotency/idempotency/idempotency.service';

@Controller('customers')
@UseGuards(PermissionGuard)
export class CustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly idempotency: IdempotencyService,
  ) {}

  @Permission('master.customers.view')
  @Get()
  list(@Query() query: ListMasterQueryDto) {
    return this.customers.list(query);
  }

  @Permission('master.customers.view')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.customers.get(id);
  }

  @Permission('master.customers.create')
  @Post()
  create(
    @Headers() headers: Record<string, string>,
    @Body() body: CreateCustomerDto,
  ) {
    const key = this.idempotency.validate(headers['idempotency-key']);
    const fingerprint = this.idempotency.fingerprint(
      'POST',
      '/customers',
      body,
    );
    return this.idempotency
      .getOrCreateAsync(key, fingerprint, () => this.customers.create(body))
      .then((result) => result.response);
  }

  @Permission('master.customers.edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCustomerDto) {
    return this.customers.update(id, body);
  }
}
