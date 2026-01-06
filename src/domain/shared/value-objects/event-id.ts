import { UuidId } from '../base/uuid-id.base';

export class EventId extends UuidId {
  static generate(): EventId {
    return super.generate.call(this);
  }
}
