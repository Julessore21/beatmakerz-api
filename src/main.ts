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
  const port =
    configService.get<number>('PORT') ??
    configService.get<number>('port') ??
    3000;
  const frontendUrl = configService.get<string>('frontendUrl');

  const allowedOrigins = [
    frontendUrl,
    frontendUrl?.includes('://www.')
      ? frontendUrl.replace('://www.', '://')
      : frontendUrl?.replace('://', '://www.'),
    'https://beatmakerz.vercel.app',
    'https://www.beatmakerz.fr',
    'https://beatmakerz.fr',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

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
    origin: (origin, callback) => {
      // Autoriser les requêtes sans header Origin (cron, Postman, Stripe...)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
