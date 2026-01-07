import { UuidId } from '../../shared/base/uuid-id.base';

export class OrderId extends UuidId {
  constructor(value: string) {
    super(value);
  }

  static fromString(value: string): OrderId {
    return new OrderId(value);
  }
}
