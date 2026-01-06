import { StringId } from '../base/string-id.base';

/**
 * Value Object: ReservationId
 * External stock reservation identifier from Inventory bounded context.
 * Format: RES-{timestamp}-{random} (e.g., "RES-20260105-XYZ789")
 */
export class ReservationId extends StringId {
  constructor(value: string) {
    super(value);
    if (!value.startsWith('RES-')) {
      throw new Error(`ReservationId must start with 'RES-': ${value}`);
    }
  }

  static fromString(value: string): ReservationId {
    return new ReservationId(value);
  }
}
