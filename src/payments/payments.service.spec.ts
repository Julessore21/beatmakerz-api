import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { OrdersService } from '../orders/orders.service';

const WEBHOOK_SECRET = 'whsec_test_secret';

const makeEvent = (overrides: Partial<Stripe.Event> = {}): Stripe.Event => ({
  id: 'evt_test_001',
  type: 'checkout.session.completed',
  object: 'event',
  api_version: '2024-04-10',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'cs_test_session',
      object: 'checkout.session',
      payment_intent: 'pi_test_001',
      metadata: { orderId: 'order-123', userId: 'user-abc' },
    } as Stripe.Checkout.Session,
  },
  livemode: false,
  pending_webhooks: 0,
  request: null,
  ...overrides,
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let ordersService: jest.Mocked<OrdersService>;
  let stripeService: jest.Mocked<StripeService>;

  beforeEach(async () => {
    const mockConstructEvent = jest.fn();

    stripeService = {
      getClient: jest.fn().mockReturnValue({
        webhooks: { constructEvent: mockConstructEvent },
      }),
    } as unknown as jest.Mocked<StripeService>;

    ordersService = {
      markAsPaid: jest.fn().mockResolvedValue({ updated: true }),
      markAsFailed: jest.fn().mockResolvedValue({ updated: true }),
      list: jest.fn(),
      findOne: jest.fn(),
      createFromCart: jest.fn(),
    } as unknown as jest.Mocked<OrdersService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: StripeService, useValue: stripeService },
        { provide: OrdersService, useValue: ordersService },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'stripe.webhookSecret') return WEBHOOK_SECRET;
              throw new Error(`Unknown config key: ${key}`);
            },
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('verifyAndConstructEvent', () => {
    it('delegates to stripe.webhooks.constructEvent with the webhook secret', () => {
      const rawBody = Buffer.from('{}');
      const sig = 'v1=test';
      const fakeEvent = makeEvent();

      (
        stripeService.getClient().webhooks.constructEvent as jest.Mock
      ).mockReturnValue(fakeEvent);

      const result = service.verifyAndConstructEvent(rawBody, sig);

      expect(
        stripeService.getClient().webhooks.constructEvent,
      ).toHaveBeenCalledWith(rawBody, sig, WEBHOOK_SECRET);
      expect(result).toEqual(fakeEvent);
    });

    it('throws when stripe throws a signature error', () => {
      (
        stripeService.getClient().webhooks.constructEvent as jest.Mock
      ).mockImplementation(() => {
        throw new Error('No signatures found matching');
      });

      expect(() =>
        service.verifyAndConstructEvent(Buffer.from('{}'), 'bad-sig'),
      ).toThrow('No signatures found matching');
    });
  });

  describe('handleEvent — checkout.session.completed', () => {
    it('calls markAsPaid with orderId and paymentIntentId', async () => {
      const event = makeEvent();
      await service.handleEvent(event);

      expect(ordersService.markAsPaid).toHaveBeenCalledWith(
        'order-123',
        'pi_test_001',
      );
    });

    it('idempotence: does not throw if order already paid (updated = false)', async () => {
      ordersService.markAsPaid.mockResolvedValue({ updated: false });
      const event = makeEvent();

      await expect(service.handleEvent(event)).resolves.not.toThrow();
      expect(ordersService.markAsPaid).toHaveBeenCalledTimes(1);
    });

    it('logs a warning and returns without error if metadata.orderId is missing', async () => {
      const event = makeEvent({
        data: {
          object: {
            id: 'cs_test',
            object: 'checkout.session',
            payment_intent: 'pi_test',
            metadata: {},
          } as Stripe.Checkout.Session,
        },
      });

      await expect(service.handleEvent(event)).resolves.not.toThrow();
      expect(ordersService.markAsPaid).not.toHaveBeenCalled();
    });
  });

  describe('handleEvent — checkout.session.expired', () => {
    it('calls markAsFailed with orderId', async () => {
      const event = makeEvent({ type: 'checkout.session.expired' });
      await service.handleEvent(event);

      expect(ordersService.markAsFailed).toHaveBeenCalledWith('order-123');
    });
  });

  describe('handleEvent — unhandled type', () => {
    it('does not call markAsPaid or markAsFailed for unknown event types', async () => {
      const event = makeEvent({
        type: 'charge.succeeded' as Stripe.Event['type'],
      });
      await service.handleEvent(event);

      expect(ordersService.markAsPaid).not.toHaveBeenCalled();
      expect(ordersService.markAsFailed).not.toHaveBeenCalled();
    });
  });
});
