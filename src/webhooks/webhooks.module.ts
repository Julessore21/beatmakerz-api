import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PaymentsModule } from '../payments/payments.module';
import { EmailsModule } from '../emails/emails.module';
import { FilesModule } from '../files/files.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [PaymentsModule, EmailsModule, FilesModule, DocumentsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
