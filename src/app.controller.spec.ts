import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            healthCheck: jest.fn().mockResolvedValue({
              status: 'ok',
              db: 'ok',
              fileup: { status: 'healthy' },
            }),
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
