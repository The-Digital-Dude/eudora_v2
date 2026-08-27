import { Test, TestingModule } from '@nestjs/testing';
import { EntitlementStatus, PlanStatus } from '@prisma/client';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

describe('WebhookService', () => {
  let service: WebhookService;

  const mockPrismaService: any = {
    stripeWebhookEvent: {
      create: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
    },
    orderItem: {
      findUnique: jest.fn(),
    },
    installmentPlan: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    entitlement: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(mockPrismaService)),
  };

  const mockStripeService: any = {
    retrieveInvoice: jest.fn(),
    retrieveCharge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StripeService, useValue: mockStripeService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    jest.clearAllMocks();
    mockPrismaService.stripeWebhookEvent.create.mockResolvedValue({});
    mockPrismaService.entitlement.updateMany.mockResolvedValue({ count: 1 });
  });

  describe('charge.refunded', () => {
    it('revokes a one-time purchase on a full refund, resolved via payment_intent', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        items: [{ id: 'item-1' }],
      });
      mockPrismaService.orderItem.findUnique.mockResolvedValue({
        id: 'item-1',
        plan: null,
      });

      const result = await service.handleEvent({
        id: 'evt_1',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_1',
            invoice: null,
            payment_intent: 'pi_1',
            refunded: true,
            amount: 5000,
            amount_refunded: 5000,
            currency: 'usd',
          },
        },
      } as any);

      expect(result).toEqual({ handled: true });
      expect(mockPrismaService.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { stripePaymentIntentId: 'pi_1' } }),
      );
      expect(mockPrismaService.entitlement.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderItemId: 'item-1' },
          data: expect.objectContaining({ status: EntitlementStatus.REVOKED }),
        }),
      );
      // No plan on this order item, so it must never touch InstallmentPlan.
      expect(mockPrismaService.installmentPlan.update).not.toHaveBeenCalled();
    });

    it('revokes on a partial refund too, not just a full one', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        items: [{ id: 'item-1' }],
      });
      mockPrismaService.orderItem.findUnique.mockResolvedValue({
        id: 'item-1',
        plan: null,
      });

      await service.handleEvent({
        id: 'evt_2',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_2',
            invoice: null,
            payment_intent: 'pi_2',
            refunded: false,
            amount: 5000,
            amount_refunded: 1000,
            currency: 'usd',
          },
        },
      } as any);

      const call = mockPrismaService.entitlement.updateMany.mock.calls[0][0];
      expect(call.data.status).toBe(EntitlementStatus.REVOKED);
      expect(call.data.note).toContain('partially refunded');
    });

    it('resolves an instalment charge via invoice -> subscription, and cancels the plan', async () => {
      mockStripeService.retrieveInvoice.mockResolvedValue({
        subscription: 'sub_1',
      });
      mockPrismaService.installmentPlan.findUnique.mockResolvedValue({
        orderItemId: 'item-2',
      });
      mockPrismaService.orderItem.findUnique.mockResolvedValue({
        id: 'item-2',
        plan: { id: 'plan-1', status: PlanStatus.ACTIVE },
      });

      await service.handleEvent({
        id: 'evt_3',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_3',
            invoice: 'in_1',
            payment_intent: 'pi_3',
            refunded: true,
            amount: 2000,
            amount_refunded: 2000,
            currency: 'usd',
          },
        },
      } as any);

      expect(mockStripeService.retrieveInvoice).toHaveBeenCalledWith('in_1');
      expect(mockPrismaService.installmentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { status: PlanStatus.CANCELLED },
      });
      expect(mockPrismaService.entitlement.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orderItemId: 'item-2' } }),
      );
    });

    it('does not re-cancel a plan that is already cancelled', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        items: [{ id: 'item-1' }],
      });
      mockPrismaService.orderItem.findUnique.mockResolvedValue({
        id: 'item-1',
        plan: { id: 'plan-1', status: PlanStatus.CANCELLED },
      });

      await service.handleEvent({
        id: 'evt_4',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_4',
            invoice: null,
            payment_intent: 'pi_4',
            refunded: true,
            amount: 2000,
            amount_refunded: 2000,
            currency: 'usd',
          },
        },
      } as any);

      expect(mockPrismaService.installmentPlan.update).not.toHaveBeenCalled();
      expect(mockPrismaService.entitlement.updateMany).toHaveBeenCalled();
    });

    it('warns and does nothing when the charge cannot be traced to any order', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      const result = await service.handleEvent({
        id: 'evt_5',
        type: 'charge.refunded',
        data: {
          object: {
            id: 'ch_5',
            invoice: null,
            payment_intent: 'pi_unknown',
            refunded: true,
            amount: 2000,
            amount_refunded: 2000,
            currency: 'usd',
          },
        },
      } as any);

      expect(result).toEqual({ handled: true });
      expect(mockPrismaService.entitlement.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('charge.dispute.created', () => {
    it('revokes access immediately, resolved via payment_intent', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        items: [{ id: 'item-1' }],
      });
      mockPrismaService.orderItem.findUnique.mockResolvedValue({
        id: 'item-1',
        plan: null,
      });

      await service.handleEvent({
        id: 'evt_6',
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_1',
            payment_intent: 'pi_6',
            charge: 'ch_6',
            amount: 4000,
            currency: 'usd',
            status: 'warning_needs_response',
          },
        },
      } as any);

      expect(mockPrismaService.entitlement.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderItemId: 'item-1' },
          data: expect.objectContaining({ status: EntitlementStatus.REVOKED }),
        }),
      );
    });

    it('falls back to charge -> invoice -> subscription when payment_intent does not match an order', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);
      mockStripeService.retrieveCharge.mockResolvedValue({ invoice: 'in_2' });
      mockStripeService.retrieveInvoice.mockResolvedValue({
        subscription: 'sub_2',
      });
      mockPrismaService.installmentPlan.findUnique.mockResolvedValue({
        orderItemId: 'item-3',
      });
      mockPrismaService.orderItem.findUnique.mockResolvedValue({
        id: 'item-3',
        plan: { id: 'plan-2', status: PlanStatus.ACTIVE },
      });

      await service.handleEvent({
        id: 'evt_7',
        type: 'charge.dispute.created',
        data: {
          object: {
            id: 'dp_2',
            payment_intent: 'pi_no_match',
            charge: 'ch_7',
            amount: 4000,
            currency: 'usd',
            status: 'warning_needs_response',
          },
        },
      } as any);

      expect(mockStripeService.retrieveCharge).toHaveBeenCalledWith('ch_7');
      expect(mockPrismaService.installmentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-2' },
        data: { status: PlanStatus.CANCELLED },
      });
    });
  });

  describe('charge.dispute.closed', () => {
    it('restores a REVOKED entitlement when the dispute is won', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue({
        items: [{ id: 'item-1' }],
      });

      await service.handleEvent({
        id: 'evt_8',
        type: 'charge.dispute.closed',
        data: {
          object: {
            id: 'dp_3',
            payment_intent: 'pi_8',
            charge: 'ch_8',
            amount: 4000,
            currency: 'usd',
            status: 'won',
          },
        },
      } as any);

      expect(mockPrismaService.entitlement.updateMany).toHaveBeenCalledWith({
        where: { orderItemId: 'item-1', status: EntitlementStatus.REVOKED },
        data: expect.objectContaining({ status: EntitlementStatus.ACTIVE }),
      });
    });

    it('does nothing when the dispute is lost', async () => {
      await service.handleEvent({
        id: 'evt_9',
        type: 'charge.dispute.closed',
        data: {
          object: {
            id: 'dp_4',
            payment_intent: 'pi_9',
            charge: 'ch_9',
            amount: 4000,
            currency: 'usd',
            status: 'lost',
          },
        },
      } as any);

      expect(mockPrismaService.order.findFirst).not.toHaveBeenCalled();
      expect(mockPrismaService.entitlement.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    it('ignores a redelivered event instead of processing it twice', async () => {
      mockPrismaService.stripeWebhookEvent.create.mockRejectedValue(
        new Error('unique constraint'),
      );

      const result = await service.handleEvent({
        id: 'evt_dup',
        type: 'charge.refunded',
        data: { object: { id: 'ch_dup' } },
      } as any);

      expect(result).toEqual({ handled: false });
      expect(mockPrismaService.entitlement.updateMany).not.toHaveBeenCalled();
    });
  });
});
