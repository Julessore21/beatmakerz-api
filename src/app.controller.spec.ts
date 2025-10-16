import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma/prisma.service";
import { StripeService } from "./payments/stripe.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
          },
        },
        {
          provide: StripeService,
          useValue: {
            getClient: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compile();

    appController = module.get<AppController>(AppController);
  });

  it("health should return status", async () => {
    const result = await appController.health();
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("db", "ok");
  });
});
