import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CreateContactSchema,
  UpdateContactSchema,
  type CreateContactInput,
  type UpdateContactInput,
} from '@ai-sdr/contracts';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import { InternalApiKeyGuard } from '../../../security/internal-api-key.guard.js';
import { ContactDiscoveryService } from '../application/contact-discovery.service.js';

@Controller('companies')
@UseGuards(InternalApiKeyGuard)
export class ContactsController {
  constructor(
    @Inject(ContactDiscoveryService)
    private readonly service: ContactDiscoveryService,
  ) {}

  @Post(':companyId/contacts')
  async createContact(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Body(new ZodValidationPipe(CreateContactSchema)) body: CreateContactInput,
  ) {
    return this.service.createContact(companyId, body);
  }

  @Get(':companyId/contacts')
  async listContacts(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
  ) {
    return this.service.listContacts(companyId);
  }

  @Patch(':companyId/contacts/:contactId')
  async updateContact(
    @Param('companyId', new ParseUUIDPipe()) companyId: string,
    @Param('contactId', new ParseUUIDPipe()) contactId: string,
    @Body(new ZodValidationPipe(UpdateContactSchema))
    body: UpdateContactInput,
  ) {
    return this.service.updateContact(companyId, contactId, body);
  }
}
