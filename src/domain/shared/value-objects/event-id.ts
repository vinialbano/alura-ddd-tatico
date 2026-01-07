import { UuidId } from '../base/uuid-id.base';

export class EventId extends UuidId {
  constructor(value: string) {
    super(value);
  }
}
