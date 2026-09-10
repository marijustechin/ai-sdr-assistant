import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppConfig } from './config/configuration.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const config = app.get<ConfigService<AppConfig>>(ConfigService);

  const port = config.getOrThrow<AppConfig['port']>('port');
  await app.listen(port);

  console.log(`API server started on port ${port}`);
}

void bootstrap();
