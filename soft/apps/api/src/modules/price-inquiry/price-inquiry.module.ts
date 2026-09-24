import { Module } from '@nestjs/common';
import { ContactDiscoveryModule } from '../contact-discovery/contact-discovery.module.js';
import { LeadDiscovererModule } from '../lead-discoverer/lead-discoverer.module.js';
import { ProductsAndOffersModule } from '../products-and-offers/products-and-offers.module.js';
import { SenderProfilesModule } from '../sender-profiles/sender-profiles.module.js';
import { PriceInquiryRepository } from './infrastructure/price-inquiry.repository.js';
import { PriceInquiryService } from './application/price-inquiry.service.js';
import { PriceInquiryController } from './presentation/price-inquiry.controller.js';

@Module({
  imports: [
    LeadDiscovererModule,
    ContactDiscoveryModule,
    ProductsAndOffersModule,
    SenderProfilesModule,
  ],
  controllers: [PriceInquiryController],
  providers: [PriceInquiryRepository, PriceInquiryService],
  exports: [PriceInquiryService],
})
export class PriceInquiryModule {}
