import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from './config/configuration.js';
import { envValidationSchema } from './config/envValidationSchema.js';
import { PrismaModule } from './modules/prisma/prisma.module.js';
import { ProductModule } from './modules/product/product.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    PrismaModule,
    ProductModule,
  ],
})
export class AppModule {}
