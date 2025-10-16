import { LicenseType, PriceOverride } from '@prisma/client';

export function resolveLicensePrice(
  license: LicenseType,
  overrides: PriceOverride[],
  beatId?: string,
): number {
  if (!beatId) {
    return license.priceCents;
  }
  const override = overrides.find((item) => item.beatId === beatId && item.licenseTypeId === license.id);
  return override?.priceCents ?? license.priceCents;
}
