import { AssetTypeEnum } from '../database/schemas/asset.schema';
import { LicenseCodeEnum } from '../database/schemas/license-type.schema';

/**
 * SEULE règle de ce qu'une licence exige et donne.
 * - requires : le fichier sans lequel la licence ne se vend pas pour une prod ;
 * - files : ce que l'acheteur peut télécharger (seulement ceux qui existent pour la prod).
 * La licence Basic correspond aux CGV : prod à l'unité, non exclusive, MP3 (et le WAV quand il existe).
 */
export const LICENSE_RULES: Record<
  LicenseCodeEnum,
  { requires: AssetTypeEnum; files: AssetTypeEnum[] }
> = {
  [LicenseCodeEnum.Basic]: {
    requires: AssetTypeEnum.mp3,
    files: [AssetTypeEnum.mp3, AssetTypeEnum.wav],
  },
  [LicenseCodeEnum.Premium]: {
    requires: AssetTypeEnum.wav,
    files: [AssetTypeEnum.mp3, AssetTypeEnum.wav],
  },
  [LicenseCodeEnum.Unlimited]: {
    requires: AssetTypeEnum.stems,
    files: [AssetTypeEnum.mp3, AssetTypeEnum.wav, AssetTypeEnum.stems],
  },
};

/** Formats vendables d'une prod (jamais l'extrait ni le projet). */
export const SELLABLE_FORMATS = [
  AssetTypeEnum.mp3,
  AssetTypeEnum.wav,
  AssetTypeEnum.stems,
];

export const canSell = (
  code: LicenseCodeEnum,
  formats: AssetTypeEnum[],
): boolean => formats.includes(LICENSE_RULES[code].requires);

/** Ce qu'un acheteur de cette licence peut télécharger, parmi les fichiers de la prod. */
export const filesFor = (
  code: LicenseCodeEnum | undefined,
  formats: AssetTypeEnum[],
): AssetTypeEnum[] =>
  code ? LICENSE_RULES[code].files.filter((f) => formats.includes(f)) : [];

/** Termes affichés de la licence Basic (CGV, article 9). */
export const BASIC_TERMS = {
  exclusive: false,
  commercialUse: true,
  resale: false,
  summary:
    'Licence non exclusive : utilisation personnelle et commerciale autorisée, revente interdite.',
};
