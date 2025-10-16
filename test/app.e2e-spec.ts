import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { StripeService } from "../src/payments/stripe.service";

describe("Health (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
      })
      .overrideProvider(StripeService)
      .useValue({
        getClient: () => ({}) as never,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("/health (GET)", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);
    expect(response.body).toHaveProperty("status");
  });
});
