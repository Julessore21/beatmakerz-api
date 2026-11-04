import { CheckoutService } from './checkout.service';

const build = (priceId?: string) => {
  const create = jest.fn().mockResolvedValue({ url: 'https://stripe.test/s' });
  const config = {
    get: jest.fn((key: string) =>
      key === 'stripe.customProdPriceId' ? priceId : 'https://beatmakerz.fr',
    ),
  };
  const stripe = { getClient: () => ({ checkout: { sessions: { create } } }) };
  const none = {} as never;
  const service = new CheckoutService(
    config as never,
    stripe as never,
    none,
    none,
    none,
    none,
    none,
    none,
    none,
  );
  return { service, create };
};

describe('CheckoutService.createCustomProdSession', () => {
  it('refuse si le prix serveur n’est pas configuré', async () => {
    await expect(
      build().service.createCustomProdSession({ genre: 'Trap' }),
    ).rejects.toThrow('Custom production price is not configured');
  });

  it('utilise le prix serveur et transmet le brief à Stripe', async () => {
    const { service, create } = build('price_custom');
    await expect(
      service.createCustomProdSession(
        { genre: 'Trap', brief: '  808 lourde  ', notes: '' },
        'a@b.fr',
      ),
    ).resolves.toEqual({ url: 'https://stripe.test/s' });

    const params = create.mock.calls[0][0];
    expect(params.line_items).toEqual([{ price: 'price_custom', quantity: 1 }]);
    expect(params.customer_email).toBe('a@b.fr');
    expect(params.metadata).toEqual({
      kind: 'custom_prod',
      genre: 'Trap',
      brief: '808 lourde',
    });
    expect(params.success_url).toBe(
      'https://beatmakerz.fr/web/prodsurmesure?success=true&session_id={CHECKOUT_SESSION_ID}',
    );
  });
});
