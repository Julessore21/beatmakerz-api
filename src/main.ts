import { Logger } from 'nestjs-pino';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, raw, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;
  const frontendUrl = configService.get<string>('frontendUrl');

  app.use('/webhooks/stripe', raw({ type: 'application/json' }));
  app.use('/webhooks/stripe', (req, _res, next) => {
    (req as unknown as { rawBody?: Buffer }).rawBody = req.body;
    next();
  });
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true }));
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: frontendUrl ? [frontendUrl] : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Beatmakerz API')
    .setDescription('API documentation for Beatmakerz marketplace.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port, '0.0.0.0');
}

bootstrap();
