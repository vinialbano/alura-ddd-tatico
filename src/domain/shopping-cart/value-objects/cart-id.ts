import { UuidId } from '../../shared/base/uuid-id.base';

export class CartId extends UuidId {
  static create(): CartId {
    return super.generate.call(this);
  }

  static fromString(value: string): CartId {
    return new CartId(value);
  }
}
