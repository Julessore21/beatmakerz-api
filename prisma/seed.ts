import { PrismaClient, AssetType, BeatStatus, BeatVisibility, LicenseCode, OrderStatus, UserRole } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash("changeme");

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: "buyer@example.com" },
      update: {},
      create: {
        email: "buyer@example.com",
        displayName: "Buyer One",
        passwordHash,
        role: UserRole.buyer,
      },
    }),
    prisma.user.upsert({
      where: { email: "seller@example.com" },
      update: {},
      create: {
        email: "seller@example.com",
        displayName: "Seller Artist",
        passwordHash,
        role: UserRole.seller,
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@example.com" },
      update: {},
      create: {
        email: "admin@example.com",
        displayName: "Admin User",
        passwordHash,
        role: UserRole.admin,
      },
    }),
  ]);

  const [buyer, seller] = users;

  const artist = await prisma.artist.upsert({
    where: { userId: seller.id },
    update: {},
    create: {
      userId: seller.id,
      name: "Beatmaker Supreme",
      bio: "Producer blending hip-hop and lo-fi vibes.",
      socialsJson: {
        instagram: "https://instagram.com/beatmaker",
        soundcloud: "https://soundcloud.com/beatmaker",
      },
      verified: true,
    },
  });

  const licenseTypes = await Promise.all(
    [
      {
        code: LicenseCode.Basic,
        priceCents: 2999,
        currency: "EUR",
        termsJson: { usage: "Online streaming up to 100k plays" },
      },
      {
        code: LicenseCode.Premium,
        priceCents: 5999,
        currency: "EUR",
        termsJson: { usage: "Limited commercial release up to 1M streams" },
      },
      {
        code: LicenseCode.Unlimited,
        priceCents: 12999,
        currency: "EUR",
        termsJson: { usage: "Unlimited commercial rights" },
      },
    ].map((license) =>
      prisma.licenseType.upsert({
        where: { code: license.code },
        update: {
          priceCents: license.priceCents,
          currency: license.currency,
          termsJson: license.termsJson,
        },
        create: license,
      }),
    ),
  );

  const beatSeeds = Array.from({ length: 12 }).map((_, index) => ({
    title: `Midnight Groove ${index + 1}`,
    bpm: 90 + index,
    key: "Am",
    genres: ["lofi", "hiphop"],
    moods: ["chill", "dreamy"],
    coverUrl: `https://example.com/covers/${index + 1}.jpg`,
    status: BeatStatus.published,
    visibility: BeatVisibility.public,
  }));

  const beats = [] as { id: string }[];
  for (const beatSeed of beatSeeds) {
    const beat = await prisma.beat.create({
      data: {
        ...beatSeed,
        artistId: artist.id,
        assets: {
          createMany: {
            data: [
              {
                type: AssetType.preview,
                storageKey: `beats/${beatSeed.title}/preview.mp3`,
                durationSec: 120,
                sizeBytes: 2_500_000,
              },
              {
                type: AssetType.mp3,
                storageKey: `beats/${beatSeed.title}/master.mp3`,
                durationSec: 180,
                sizeBytes: 6_500_000,
              },
            ],
          },
        },
      },
    });
    beats.push({ id: beat.id });

    await prisma.priceOverride.createMany({
      data: licenseTypes.map((license, idx) => ({
        beatId: beat.id,
        licenseTypeId: license.id,
        priceCents: license.priceCents + idx * 1000,
      })),
      skipDuplicates: true,
    });
  }

  const sampleBeat = beats[0];
  if (sampleBeat) {
    await prisma.cart.upsert({
      where: { userId: buyer.id },
      update: {},
      create: {
        userId: buyer.id,
        items: {
          create: {
            beatId: sampleBeat.id,
            licenseTypeId: licenseTypes[0].id,
            unitPriceSnapshotCents: licenseTypes[0].priceCents,
          },
        },
      },
    });

    const beatWithAssets = await prisma.beat.findUnique({
      where: { id: sampleBeat.id },
      include: { assets: true },
    });

    if (beatWithAssets) {
      const order = await prisma.order.create({
        data: {
          userId: buyer.id,
          status: OrderStatus.paid,
          subtotalCents: 5999,
          taxCents: 1200,
          totalCents: 7199,
          currency: "EUR",
          stripePaymentIntentId: "pi_seed_123",
          stripeCheckoutSessionId: "cs_seed_123",
        },
      });

      const orderItem = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          beatId: beatWithAssets.id,
          licenseTypeId: licenseTypes[1].id,
          unitPriceCents: 5999,
          qty: 1,
          downloadExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const downloadableAsset = beatWithAssets.assets.find((asset) => asset.type !== AssetType.preview);
      if (downloadableAsset) {
        await prisma.downloadGrant.create({
          data: {
            orderItemId: orderItem.id,
            assetId: downloadableAsset.id,
            presignedKey: downloadableAsset.storageKey,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });
      }
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
