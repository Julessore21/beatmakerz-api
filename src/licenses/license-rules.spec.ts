import { AssetTypeEnum } from '../database/schemas/asset.schema';
import { LicenseCodeEnum } from '../database/schemas/license-type.schema';
import { canSell, filesFor } from './license-rules';

describe('license rules', () => {
  it('ne vend la licence Basic que si le MP3 existe', () => {
    expect(canSell(LicenseCodeEnum.Basic, [AssetTypeEnum.mp3])).toBe(true);
    expect(canSell(LicenseCodeEnum.Basic, [AssetTypeEnum.wav])).toBe(false);
  });

  it('donne le MP3 et le WAV de la licence Basic, jamais les pistes', () => {
    const all = [AssetTypeEnum.mp3, AssetTypeEnum.wav, AssetTypeEnum.stems];
    expect(filesFor(LicenseCodeEnum.Basic, all)).toEqual([
      AssetTypeEnum.mp3,
      AssetTypeEnum.wav,
    ]);
    expect(filesFor(LicenseCodeEnum.Basic, [AssetTypeEnum.mp3])).toEqual([
      AssetTypeEnum.mp3,
    ]);
    expect(filesFor(LicenseCodeEnum.Unlimited, all)).toContain(
      AssetTypeEnum.stems,
    );
    expect(filesFor(undefined, all)).toEqual([]);
  });
});
