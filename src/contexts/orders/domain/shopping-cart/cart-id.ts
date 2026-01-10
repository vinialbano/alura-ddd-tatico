import { UuidId } from '../../../../shared/value-objects/uuid-id.base';

export class CartId extends UuidId {
  constructor(value: string) {
    super(value);
  }

  static create() {
    return super.generate.call(this) as CartId;
  }

  static fromString(value: string): CartId {
    return new CartId(value);
  }
}
