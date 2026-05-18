import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DownloadsController } from './downloads.controller';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.accessSecret'),
      }),
    }),
  ],
  controllers: [DownloadsController],
  exports: [JwtModule],
})
export class DownloadsModule {}
