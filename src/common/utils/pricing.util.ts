export interface LicensePriceShape {
  id: string;
  priceCents: number;
}

export interface PriceOverrideShape {
  beatId: string;
  licenseTypeId: string;
  priceCents: number;
}

export function resolveLicensePrice(
  license: LicensePriceShape,
  overrides: PriceOverrideShape[],
  beatId?: string,
): number {
  if (!beatId) {
    return license.priceCents;
  }
  const override = overrides.find((item) => item.beatId === beatId && item.licenseTypeId === license.id);
  return override?.priceCents ?? license.priceCents;
}
