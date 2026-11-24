import { isPublicKey, isR2Key, keyOf, objectKey } from './storage-keys';

describe('storage keys', () => {
  it('garde le chemin logique et ajoute un suffixe avant l’extension', () => {
    expect(objectKey('beats/42/wav/Ma Prod #1.wav', 'ab12')).toBe(
      'beats/42/wav/Ma-Prod-1-ab12.wav',
    );
  });

  it('range une pochette dans covers/ (seul dossier public)', () => {
    const key = objectKey('beats/42/cover.jpg', 'ab12');
    expect(key).toBe('covers/42/cover-ab12.jpg');
    expect(isPublicKey(key)).toBe(true);
  });

  it('ne rend jamais publics les fichiers achetables', () => {
    for (const type of ['mp3', 'wav', 'stems', 'preview', 'project']) {
      expect(isPublicKey(objectKey(`beats/42/${type}/x.wav`, 'ab'))).toBe(
        false,
      );
    }
    expect(isPublicKey('covers/../beats/42/wav/x.wav')).toBe(false);
  });

  it('ne laisse jamais remonter hors du dossier', () => {
    expect(objectKey('../../etc/passwd', 'ab')).toBe('etc/passwd-ab');
    expect(objectKey('', 'ab')).toBe('file-ab');
  });

  it('reconnaît une référence R2 et une ancienne adresse FileUp', () => {
    expect(isR2Key('r2:beats/1/x.mp3')).toBe(true);
    expect(keyOf('r2:beats/1/x.mp3')).toBe('beats/1/x.mp3');
    expect(isR2Key('https://file-up.fr/abc')).toBe(false);
  });
});
