import { DomainEvent } from '../../shared/domain-event';
import { EventId } from '../../shared/value-objects/event-id';

/**
 * Domain event raised when an order transitions to Cancelled status
 *
 * This event represents order cancellation from either:
 * - AwaitingPayment: Pre-payment cancellation (no refund needed)
 * - Paid: Post-payment cancellation (refund scenario)
 *
 * The previousState field allows subscribers to distinguish between these
 * scenarios and take appropriate action.
 *
 * Subscribers can use this event to:
 * - Process refunds (if previousState was Paid)
 * - Release inventory reservations
 * - Send cancellation confirmation emails
 * - Update analytics and cancellation metrics
 *
 * BREAKING CHANGE: eventId is now the first parameter for idempotency support
 */
export class OrderCancelled implements DomainEvent {
  constructor(
    public readonly eventId: EventId,
    public readonly aggregateId: string,
    public readonly occurredAt: Date,
    public readonly cancellationReason: string,
    public readonly previousState: string,
  ) {}
}
