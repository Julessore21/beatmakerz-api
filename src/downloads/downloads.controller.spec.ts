import { JwtService } from '@nestjs/jwt';
import { DownloadsController } from './downloads.controller';
import { FilesService } from '../files/files.service';

describe('DownloadsController (R2)', () => {
  it('redirige un fichier R2 vers une adresse signée de 5 minutes', async () => {
    const jwt = {
      verify: () => ({
        sub: 'download',
        orderItemId: 'o1',
        userId: 'u1',
        storageKey: 'r2:beats/1/wav/x.wav',
        assetType: 'wav',
      }),
    } as unknown as JwtService;
    const signedUrl = jest.fn().mockResolvedValue('https://signed.example/x');
    const files = { signedUrl } as unknown as FilesService;
    const res = { setHeader: jest.fn(), redirect: jest.fn() };
    await new DownloadsController(jwt, files).serveSignedDownload(
      't',
      res as never,
    );
    expect(signedUrl).toHaveBeenCalledWith('r2:beats/1/wav/x.wav', {
      expiresIn: 300,
      downloadName: 'beat-o1.wav',
    });
    expect(res.redirect).toHaveBeenCalledWith(302, 'https://signed.example/x');
  });
});
