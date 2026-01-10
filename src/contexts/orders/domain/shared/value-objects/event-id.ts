import { UuidId } from '../../../../../shared/value-objects/uuid-id.base';

export class EventId extends UuidId {
  constructor(value: string) {
    super(value);
  }
}
