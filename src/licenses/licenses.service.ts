import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LicenseCodeEnum,
  LicenseType,
  LicenseTypeDocument,
} from '../database/schemas/license-type.schema';
import { BASIC_TERMS, LICENSE_RULES } from './license-rules';

/** Prix de la licence Basic (CGV : instrumentale à l'unité, 9,99 €), réglable par LICENSE_BASIC_CENTS. */
export const DEFAULT_BASIC_CENTS = 999;

export function basicCentsFromEnv(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_BASIC_CENTS;
}

@Injectable()
export class LicensesService implements OnModuleInit {
  private readonly logger = new Logger(LicensesService.name);

  constructor(
    @InjectModel(LicenseType.name)
    private readonly licenseTypeModel: Model<LicenseTypeDocument>,
  ) {}

  /** Base neuve : la licence Basic est créée ; son prix suit LICENSE_BASIC_CENTS s'il est donné. */
  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    try {
      await this.ensureBasic(process.env.LICENSE_BASIC_CENTS);
    } catch (e) {
      this.logger.error(`Licence Basic non créée : ${(e as Error).message}`);
    }
  }

  async ensureBasic(rawCents: string | undefined) {
    const priceCents = basicCentsFromEnv(rawCents);
    const existing = await this.licenseTypeModel
      .findOne({ code: LicenseCodeEnum.Basic })
      .lean();
    if (!existing) {
      await this.licenseTypeModel.create({
        code: LicenseCodeEnum.Basic,
        priceCents,
        currency: 'EUR',
        termsJson: BASIC_TERMS,
      });
      this.logger.log(`Licence Basic créée à ${String(priceCents)} centimes.`);
      return;
    }
    if (rawCents !== undefined && existing.priceCents !== priceCents) {
      await this.licenseTypeModel.updateOne(
        { _id: existing._id },
        { $set: { priceCents } },
      );
      this.logger.log(
        `Prix de la licence Basic : ${String(priceCents)} centimes.`,
      );
    }
  }

  /** Licences publiques, la moins chère d'abord, avec ce que chacune donne. */
  async list() {
    const all = await this.licenseTypeModel
      .find()
      .sort({ priceCents: 1 })
      .lean();
    return all.map((l) => ({
      id: String(l._id),
      code: l.code,
      priceCents: l.priceCents,
      currency: l.currency,
      files: LICENSE_RULES[l.code]?.files ?? [],
      terms: l.termsJson,
    }));
  }
}
