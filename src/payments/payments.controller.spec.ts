import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

const makeEvent = (): Stripe.Event => ({
  id: 'evt_test_001',
  type: 'checkout.session.completed',
  object: 'event',
  api_version: '2024-04-10',
  created: Math.floor(Date.now() / 1000),
  data: { object: { id: 'cs_test' } as Stripe.Checkout.Session },
  livemode: false,
  pending_webhooks: 0,
  request: null,
});

const makeMockRes = () => {
  const res: { status: jest.Mock; json: jest.Mock; _status?: number } = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
};

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: jest.Mocked<PaymentsService>;

  beforeEach(async () => {
    paymentsService = {
      verifyAndConstructEvent: jest.fn(),
      handleEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PaymentsService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('returns 400 when stripe-signature header is missing', () => {
    const req = { headers: {}, rawBody: Buffer.from('{}') } as any;
    const res = makeMockRes();

    controller.handleStripeWebhook(req, res as any);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
    expect(paymentsService.verifyAndConstructEvent).not.toHaveBeenCalled();
  });

  it('returns 400 when signature verification fails', () => {
    const req = {
      headers: { 'stripe-signature': 'bad-sig' },
      rawBody: Buffer.from('{}'),
    } as any;
    const res = makeMockRes();

    paymentsService.verifyAndConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found');
    });

    controller.handleStripeWebhook(req, res as any);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid signature' });
  });

  it('returns 200 and calls handleEvent when signature is valid', async () => {
    const event = makeEvent();
    const req = {
      headers: { 'stripe-signature': 'v1=valid' },
      rawBody: Buffer.from('{}'),
    } as any;
    const res = makeMockRes();

    paymentsService.verifyAndConstructEvent.mockReturnValue(event);

    controller.handleStripeWebhook(req, res as any);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith({ received: true });
    // handleEvent est déclenché async — on attend la prochaine tick
    await new Promise((r) => setTimeout(r, 10));
    expect(paymentsService.handleEvent).toHaveBeenCalledWith(event);
  });

  it('returns 200 even for unhandled event types (Stripe doit recevoir 200 sinon il retry)', () => {
    const event = makeEvent();
    const req = {
      headers: { 'stripe-signature': 'v1=valid' },
      rawBody: Buffer.from('{}'),
    } as any;
    const res = makeMockRes();

    paymentsService.verifyAndConstructEvent.mockReturnValue({
      ...event,
      type: 'charge.succeeded' as any,
    });

    controller.handleStripeWebhook(req, res as any);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
  });
});
