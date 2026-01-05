import { DomainEvent } from '../../shared/domain-event';

/**
 * Domain event raised when an order successfully transitions to Paid status
 *
 * This event represents a significant business moment: payment has been
 * confirmed and the order is now paid. Subscribers can use this event to:
 * - Reserve inventory
 * - Send confirmation emails
 * - Trigger fulfillment process
 * - Update analytics
 */
export class OrderPaid implements DomainEvent {
  constructor(
    public readonly aggregateId: string,
    public readonly occurredAt: Date,
    public readonly paymentId: string,
  ) {}
}
