import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

interface LicensePdfPayload {
  orderId: string;
  issuedAt: Date;
  buyerName: string;
  buyerEmail: string;
  beatTitle: string;
  artistName: string;
  licenseName: string;
  licenseTerms: Record<string, unknown> | undefined;
}

@Injectable()
export class DocumentsService {
  async generateLicensePdf(payload: LicensePdfPayload): Promise<Buffer> {
    return new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      doc.fontSize(20).text('Beatmakerz Licence', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Numero de commande: ${payload.orderId}`);
      doc.text(`Date d'émission: ${payload.issuedAt.toISOString()}`);
      doc.moveDown();

      doc.fontSize(14).text('Acheteur', { underline: true });
      doc.fontSize(12).text(`Nom affiché: ${payload.buyerName}`);
      doc.text(`Email: ${payload.buyerEmail}`);
      doc.moveDown();

      doc.fontSize(14).text('Travail licencié', { underline: true });
      doc.fontSize(12).text(`Titre du beat: ${payload.beatTitle}`);
      doc.text(`Artiste: ${payload.artistName}`);
      doc.text(`Licence: ${payload.licenseName}`);
      doc.moveDown();

      doc.fontSize(14).text('Conditions', { underline: true });
      if (payload.licenseTerms) {
        doc.fontSize(12).text(JSON.stringify(payload.licenseTerms, null, 2));
      } else {
        doc.fontSize(12).text('Voir les conditions associées à votre licence.');
      }

      doc.end();
    });
  }
}
