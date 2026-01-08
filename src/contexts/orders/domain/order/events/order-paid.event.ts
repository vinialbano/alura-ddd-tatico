import { DomainEvent } from '../../shared/domain-event';
import { EventId } from '../../shared/value-objects/event-id';

/**
 * Domain event raised when an order successfully transitions to Paid status
 *
 * This event represents a significant business moment: payment has been
 * confirmed and the order is now paid. Subscribers can use this event to:
 * - Reserve inventory
 * - Send confirmation emails
 * - Trigger fulfillment process
 * - Update analytics
 *
 * BREAKING CHANGE: eventId is now the first parameter for idempotency support
 */
export class OrderPaid implements DomainEvent {
  constructor(
    public readonly eventId: EventId,
    public readonly aggregateId: string,
    public readonly occurredAt: Date,
    public readonly paymentId: string,
  ) {}
}
