import { Test, TestingModule } from '@nestjs/testing';
import { StripeWebhookService } from './stripe-webhook.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import {
  InvoiceStatus,
  PaymentStatus,
  SubscriptionStatus,
  Prisma,
} from '@prisma/client';

/**
 * These tests pin the Stripe payload shapes this service depends on.
 *
 * The previous implementation read `invoice.subscription` and
 * `subscription.current_period_end`, both of which were moved in Stripe API
 * 2025-03+. Because those reads returned `undefined` rather than throwing, the
 * handlers silently did nothing. The fixtures below use the *current* nesting,
 * so a regression back to the old paths fails these tests instead of failing
 * silently in production.
 */
describe('StripeWebhookService', () => {
  let service: StripeWebhookService;

  const mockPrisma: any = {
    stripeEvent: { create: jest.fn(), delete: jest.fn() },
    subscription: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    invoice: { upsert: jest.fn() },
    payment: { upsert: jest.fn() },
  };

  const mockStripeClient: any = {
    subscriptions: { retrieve: jest.fn() },
  };

  const mockStripeService: any = {
    client: mockStripeClient,
    isConfigured: true,
    webhookSecret: 'whsec_test',
  };

  const LOCAL_SUB = {
    id: 'sub-local-1',
    campusId: 'campus-1',
    stripeSubscriptionId: 'sub_stripe_1',
    status: SubscriptionStatus.ACTIVE,
  };

  /** Invoice in the current shape: subscription lives under `parent`. */
  const paidInvoice: any = {
    id: 'in_1',
    currency: 'usd',
    amount_paid: 2900,
    amount_due: 2900,
    parent: {
      subscription_details: { subscription: 'sub_stripe_1' },
    },
    payments: {
      data: [{ payment: { payment_intent: 'pi_1' } }],
    },
  };

  const event = (type: string, object: any, id = 'evt_1'): any => ({
    id,
    type,
    data: { object },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.stripeEvent.create.mockResolvedValue({});
    mockPrisma.invoice.upsert.mockResolvedValue({ id: 'inv-local-1' });
    mockPrisma.payment.upsert.mockResolvedValue({});
    mockPrisma.subscription.update.mockResolvedValue({});
    mockPrisma.subscription.upsert.mockResolvedValue({});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeWebhookService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: StripeService, useValue: mockStripeService },
      ],
    }).compile();

    service = module.get<StripeWebhookService>(StripeWebhookService);
  });

  describe('idempotency', () => {
    it('processes an event the first time it is seen', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(LOCAL_SUB);

      await service.handleEvent(event('invoice.payment_succeeded', paidInvoice));

      expect(mockPrisma.invoice.upsert).toHaveBeenCalledTimes(1);
    });

    it('skips an event that was already processed', async () => {
      // Unique-constraint violation on the event id = a duplicate delivery.
      mockPrisma.stripeEvent.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await service.handleEvent(event('invoice.payment_succeeded', paidInvoice));

      expect(mockPrisma.invoice.upsert).not.toHaveBeenCalled();
    });

    it('releases the claim when a handler throws, so Stripe can retry', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(LOCAL_SUB);
      mockPrisma.invoice.upsert.mockRejectedValue(new Error('db down'));
      mockPrisma.stripeEvent.delete.mockResolvedValue({});

      await expect(
        service.handleEvent(event('invoice.payment_succeeded', paidInvoice)),
      ).rejects.toThrow('db down');

      expect(mockPrisma.stripeEvent.delete).toHaveBeenCalledWith({
        where: { id: 'evt_1' },
      });
    });
  });

  describe('invoice.payment_succeeded', () => {
    it('records the invoice and payment from the nested payload', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(LOCAL_SUB);

      await service.handleEvent(event('invoice.payment_succeeded', paidInvoice));

      // Resolved the subscription via parent.subscription_details.
      expect(mockPrisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_stripe_1' },
      });

      expect(mockPrisma.invoice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeInvoiceId: 'in_1' },
          create: expect.objectContaining({
            amount: 29, // cents -> currency units
            currency: 'USD',
            status: InvoiceStatus.PAID,
          }),
        }),
      );

      // Resolved the payment intent via payments.data[0].payment.
      expect(mockPrisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripePaymentIntentId: 'pi_1' },
          create: expect.objectContaining({
            status: PaymentStatus.SUCCEEDED,
            amount: 29,
          }),
        }),
      );
    });

    it('clears PAST_DUE once payment succeeds', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        ...LOCAL_SUB,
        status: SubscriptionStatus.PAST_DUE,
      });

      await service.handleEvent(event('invoice.payment_succeeded', paidInvoice));

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-local-1' },
        data: { status: SubscriptionStatus.ACTIVE },
      });
    });

    it('ignores an invoice with no subscription parent', async () => {
      const oneOff = { ...paidInvoice, parent: null };

      await service.handleEvent(event('invoice.payment_succeeded', oneOff));

      expect(mockPrisma.invoice.upsert).not.toHaveBeenCalled();
    });
  });

  describe('invoice.payment_failed', () => {
    it('marks the subscription PAST_DUE and records a failed payment', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(LOCAL_SUB);

      await service.handleEvent(event('invoice.payment_failed', paidInvoice));

      expect(mockPrisma.invoice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: InvoiceStatus.OPEN }),
        }),
      );
      expect(mockPrisma.payment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ status: PaymentStatus.FAILED }),
        }),
      );
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-local-1' },
        data: { status: SubscriptionStatus.PAST_DUE },
      });
    });
  });

  describe('checkout.session.completed', () => {
    const session: any = {
      id: 'cs_1',
      mode: 'subscription',
      payment_status: 'paid',
      customer: 'cus_1',
      subscription: 'sub_stripe_1',
      metadata: {
        campusId: 'campus-1',
        planId: 'plan-1',
        interval: 'MONTHLY',
      },
    };

    it('creates the local subscription with the period from the item', async () => {
      mockStripeClient.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_stripe_1',
        status: 'trialing',
        trial_end: 1700000000,
        // Period lives on the ITEM, not the subscription.
        items: {
          data: [
            {
              current_period_start: 1690000000,
              current_period_end: 1692678400,
            },
          ],
        },
      });

      await service.handleEvent(event('checkout.session.completed', session));

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { campusId: 'campus-1' },
          create: expect.objectContaining({
            planId: 'plan-1',
            stripeCustomerId: 'cus_1',
            stripeSubscriptionId: 'sub_stripe_1',
            status: SubscriptionStatus.TRIALING,
            currentPeriodStart: new Date(1690000000 * 1000),
            currentPeriodEnd: new Date(1692678400 * 1000),
          }),
        }),
      );
    });

    it('does not create a subscription when the session is unpaid', async () => {
      await service.handleEvent(
        event('checkout.session.completed', {
          ...session,
          payment_status: 'unpaid',
        }),
      );

      expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it('does not create a subscription when metadata is missing', async () => {
      await service.handleEvent(
        event('checkout.session.completed', { ...session, metadata: {} }),
      );

      expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled();
    });
  });
});
