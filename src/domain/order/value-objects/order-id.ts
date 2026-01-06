import { UuidId } from '../../shared/base/uuid-id.base';

export class OrderId extends UuidId {
  static generate(): OrderId {
    return super.generate.call(this);
  }

  static fromString(value: string): OrderId {
    return new OrderId(value);
  }
}
