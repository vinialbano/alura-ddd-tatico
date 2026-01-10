# Payment Context Separation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor codebase to properly separate Payment and Orders bounded contexts with clean communication patterns

**Architecture:** Single NestJS app with two logical bounded contexts (`src/contexts/orders/` and `src/contexts/payments/`) sharing common types via shared kernel (`src/shared/`). Payments→Orders sync via OrderGateway, bidirectional async via message bus.

**Tech Stack:** NestJS 11.0.1, TypeScript 5.7.3

---

## Phase 1: Create Directory Structure

### Task 1: Create Shared Kernel Directories

**Files:**
- Create: `src/shared/value-objects/.gitkeep`
- Create: `src/shared/events/.gitkeep`
- Create: `src/shared/message-bus/.gitkeep`

**Step 1: Create directories**

```bash
mkdir -p src/shared/value-objects
mkdir -p src/shared/events
mkdir -p src/shared/message-bus
touch src/shared/value-objects/.gitkeep
touch src/shared/events/.gitkeep
touch src/shared/message-bus/.gitkeep
```

**Step 2: Commit**

```bash
git add src/shared/
git commit -m "chore: create shared kernel directory structure"
```

---

### Task 2: Create Payments BC Directories

**Files:**
- Create: `src/contexts/payments/application/services/.gitkeep`
- Create: `src/contexts/payments/application/gateways/.gitkeep`
- Create: `src/contexts/payments/application/dtos/.gitkeep`
- Create: `src/contexts/payments/infrastructure/controllers/.gitkeep`
- Create: `src/contexts/payments/infrastructure/gateways/.gitkeep`
- Create: `src/contexts/payments/infrastructure/events/consumers/.gitkeep`
- Create: `src/contexts/payments/infrastructure/modules/.gitkeep`

**Step 1: Create directories**

```bash
mkdir -p src/contexts/payments/application/services
mkdir -p src/contexts/payments/application/gateways
mkdir -p src/contexts/payments/application/dtos
mkdir -p src/contexts/payments/infrastructure/controllers
mkdir -p src/contexts/payments/infrastructure/gateways
mkdir -p src/contexts/payments/infrastructure/events/consumers
mkdir -p src/contexts/payments/infrastructure/modules
touch src/contexts/payments/application/services/.gitkeep
touch src/contexts/payments/application/gateways/.gitkeep
touch src/contexts/payments/application/dtos/.gitkeep
touch src/contexts/payments/infrastructure/controllers/.gitkeep
touch src/contexts/payments/infrastructure/gateways/.gitkeep
touch src/contexts/payments/infrastructure/events/consumers/.gitkeep
touch src/contexts/payments/infrastructure/modules/.gitkeep
```

**Step 2: Commit**

```bash
git add src/contexts/payments/
git commit -m "chore: create Payments BC directory structure"
```

---

### Task 3: Create Orders BC Directories

**Files:**
- Create: `src/contexts/orders/domain/.gitkeep`
- Create: `src/contexts/orders/application/.gitkeep`
- Create: `src/contexts/orders/infrastructure/.gitkeep`

**Step 1: Create directories**

```bash
mkdir -p src/contexts/orders/domain
mkdir -p src/contexts/orders/application
mkdir -p src/contexts/orders/infrastructure
touch src/contexts/orders/domain/.gitkeep
touch src/contexts/orders/application/.gitkeep
touch src/contexts/orders/infrastructure/.gitkeep
```

**Step 2: Commit**

```bash
git add src/contexts/orders/
git commit -m "chore: create Orders BC directory structure"
```

---

## Phase 2: Move Shared Types to Shared Kernel

### Task 4: Move Money Value Object

**Files:**
- Move: `src/domain/order/value-objects/money.ts` → `src/shared/value-objects/money.ts`

**Step 1: Copy file to new location**

```bash
cp src/domain/order/value-objects/money.ts src/shared/value-objects/money.ts
```

**Step 2: Update imports in Money file (if any internal imports exist)**

No changes needed - Money has no internal dependencies.

**Step 3: Find and update all imports**

```bash
# Find all files importing Money
grep -r "from.*domain/order/value-objects/money" src/ --include="*.ts"
```

Update each file from:
```typescript
import { Money } from '../../domain/order/value-objects/money';
```
to:
```typescript
import { Money } from '../../shared/value-objects/money';
```

**Step 4: Delete old file**

```bash
rm src/domain/order/value-objects/money.ts
```

**Step 5: Run TypeScript compiler**

```bash
npm run build
```

Expected: SUCCESS (all imports resolved)

**Step 6: Commit**

```bash
git add src/shared/value-objects/money.ts src/
git commit -m "refactor: move Money to shared kernel"
```

---

### Task 5: Move OrderId Value Object

**Files:**
- Move: `src/domain/order/value-objects/order-id.ts` → `src/shared/value-objects/order-id.ts`

**Step 1: Copy file to new location**

```bash
cp src/domain/order/value-objects/order-id.ts src/shared/value-objects/order-id.ts
```

**Step 2: Update imports in OrderId file**

Change:
```typescript
import { UuidIdBase } from '../../shared/base/uuid-id.base';
```
to:
```typescript
import { UuidIdBase } from '../../domain/shared/base/uuid-id.base';
```

**Step 3: Find and update all imports**

```bash
grep -r "from.*domain/order/value-objects/order-id" src/ --include="*.ts"
```

Update imports appropriately based on file location.

**Step 4: Delete old file**

```bash
rm src/domain/order/value-objects/order-id.ts
```

**Step 5: Run TypeScript compiler**

```bash
npm run build
```

Expected: SUCCESS

**Step 6: Commit**

```bash
git add src/shared/value-objects/order-id.ts src/
git commit -m "refactor: move OrderId to shared kernel"
```

---

### Task 6: Move PaymentId Value Object

**Files:**
- Move: `src/domain/shared/value-objects/payment-id.ts` → `src/shared/value-objects/payment-id.ts`

**Step 1: Copy file to new location**

```bash
cp src/domain/shared/value-objects/payment-id.ts src/shared/value-objects/payment-id.ts
```

**Step 2: Update imports in PaymentId file**

Change:
```typescript
import { StringIdBase } from '../base/string-id.base';
```
to:
```typescript
import { StringIdBase } from '../../domain/shared/base/string-id.base';
```

**Step 3: Find and update all imports**

```bash
grep -r "from.*domain/shared/value-objects/payment-id" src/ --include="*.ts"
```

Update imports appropriately.

**Step 4: Delete old file**

```bash
rm src/domain/shared/value-objects/payment-id.ts
```

**Step 5: Run TypeScript compiler**

```bash
npm run build
```

Expected: SUCCESS

**Step 6: Commit**

```bash
git add src/shared/value-objects/payment-id.ts src/
git commit -m "refactor: move PaymentId to shared kernel"
```

---

### Task 7: Move Integration Messages

**Files:**
- Move: `src/application/events/integration-message.ts` → `src/shared/events/integration-message.ts`

**Step 1: Copy file to new location**

```bash
cp src/application/events/integration-message.ts src/shared/events/integration-message.ts
```

**Step 2: Update imports in integration-message.ts (none expected)**

No changes needed.

**Step 3: Find and update all imports**

```bash
grep -r "from.*application/events/integration-message" src/ --include="*.ts"
```

Update imports appropriately.

**Step 4: Delete old file**

```bash
rm src/application/events/integration-message.ts
```

**Step 5: Run TypeScript compiler**

```bash
npm run build
```

Expected: SUCCESS

**Step 6: Commit**

```bash
git add src/shared/events/integration-message.ts src/
git commit -m "refactor: move integration messages to shared kernel"
```

---

### Task 8: Move Message Bus Interface

**Files:**
- Move: `src/application/events/message-bus.interface.ts` → `src/shared/message-bus/message-bus.interface.ts`

**Step 1: Copy file to new location**

```bash
cp src/application/events/message-bus.interface.ts src/shared/message-bus/message-bus.interface.ts
```

**Step 2: Update imports in message-bus.interface.ts**

Change:
```typescript
import { IntegrationMessage } from './integration-message';
```
to:
```typescript
import { IntegrationMessage } from '../events/integration-message';
```

**Step 3: Find and update all imports**

```bash
grep -r "from.*application/events/message-bus" src/ --include="*.ts"
```

Update imports appropriately, including the MESSAGE_BUS constant export location.

**Step 4: Delete old file**

```bash
rm src/application/events/message-bus.interface.ts
```

**Step 5: Run TypeScript compiler**

```bash
npm run build
```

Expected: SUCCESS

**Step 6: Commit**

```bash
git add src/shared/message-bus/message-bus.interface.ts src/
git commit -m "refactor: move message bus interface to shared kernel"
```

---

## Phase 3: Create Payments BC Components

### Task 9: Create OrderGateway Interface

**Files:**
- Create: `src/contexts/payments/application/gateways/order-gateway.interface.ts`

**Step 1: Write the interface**

```typescript
export interface IOrderGateway {
  /**
   * Mark an order as paid
   * Called by Payments BC after successful payment processing
   */
  markOrderAsPaid(orderId: string, paymentId: string): Promise<void>;
}

export const ORDER_GATEWAY = Symbol('ORDER_GATEWAY');
```

**Step 2: Commit**

```bash
git add src/contexts/payments/application/gateways/order-gateway.interface.ts
git commit -m "feat(payments): add OrderGateway interface"
```

---

### Task 10: Create Payment DTO

**Files:**
- Create: `src/contexts/payments/application/dtos/process-payment.dto.ts`

**Step 1: Write the DTO**

```typescript
import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class ProcessPaymentDto {
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsString()
  currency: string;
}
```

**Step 2: Commit**

```bash
git add src/contexts/payments/application/dtos/process-payment.dto.ts
git commit -m "feat(payments): add ProcessPayment DTO"
```

---

### Task 11: Create PaymentResult Type

**Files:**
- Create: `src/contexts/payments/application/services/payment-result.ts`

**Step 1: Write the type**

```typescript
export type PaymentResult =
  | { success: true; paymentId: string }
  | { success: false; reason: string };
```

**Step 2: Commit**

```bash
git add src/contexts/payments/application/services/payment-result.ts
git commit -m "feat(payments): add PaymentResult type"
```

---

### Task 12: Create ProcessPaymentService

**Files:**
- Create: `src/contexts/payments/application/services/process-payment.service.ts`

**Step 1: Write the service**

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { Money } from '../../../shared/value-objects/money';
import { IOrderGateway, ORDER_GATEWAY } from '../gateways/order-gateway.interface';
import { PaymentResult } from './payment-result';

@Injectable()
export class ProcessPaymentService {
  constructor(
    @Inject(ORDER_GATEWAY)
    private readonly orderGateway: IOrderGateway,
  ) {}

  async execute(orderId: string, amount: Money): Promise<PaymentResult> {
    await this.simulateLatency();

    const validation = this.validatePayment(orderId, amount);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    const paymentId = this.generatePaymentId(orderId);

    await this.orderGateway.markOrderAsPaid(orderId, paymentId);

    return { success: true, paymentId };
  }

  private simulateLatency(): Promise<void> {
    const delay = Math.floor(Math.random() * 1500) + 500;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private generatePaymentId(orderId: string): string {
    return `PAY-${orderId}`;
  }

  private validatePayment(
    orderId: string,
    amount: Money,
  ): { valid: boolean; reason: string } {
    if (amount.amount < 0.01) {
      return { valid: false, reason: 'Invalid amount' };
    }

    if (amount.amount > 10000) {
      return { valid: false, reason: 'Fraud check failed' };
    }

    const lastChar = orderId.charAt(orderId.length - 1);

    if (lastChar === '5') {
      return { valid: false, reason: 'Insufficient funds' };
    }

    if (lastChar === '9') {
      return { valid: false, reason: 'Card declined' };
    }

    return { valid: true, reason: '' };
  }
}
```

**Step 2: Commit**

```bash
git add src/contexts/payments/application/services/process-payment.service.ts
git commit -m "feat(payments): add ProcessPaymentService"
```

---

### Task 13: Move PaymentsConsumer

**Files:**
- Move: `src/infrastructure/events/consumers/payments-consumer.ts` → `src/contexts/payments/infrastructure/events/consumers/payments-consumer.ts`

**Step 1: Copy file**

```bash
cp src/infrastructure/events/consumers/payments-consumer.ts src/contexts/payments/infrastructure/events/consumers/payments-consumer.ts
```

**Step 2: Update imports in PaymentsConsumer**

Change:
```typescript
import type { IMessageBus } from '../../../application/events/message-bus.interface';
import { MESSAGE_BUS } from '../../../application/events/message-bus.interface';
import {
  IntegrationMessage,
  OrderPlacedPayload,
  OrderCancelledPayload,
  PaymentApprovedPayload,
} from '../../../application/events/integration-message';
```

to:
```typescript
import type { IMessageBus } from '../../../../shared/message-bus/message-bus.interface';
import { MESSAGE_BUS } from '../../../../shared/message-bus/message-bus.interface';
import {
  IntegrationMessage,
  OrderPlacedPayload,
  OrderCancelledPayload,
  PaymentApprovedPayload,
} from '../../../../shared/events/integration-message';
```

**Step 3: Delete old file (do this later after verifying module wiring)**

Mark for deletion but don't delete yet.

**Step 4: Commit**

```bash
git add src/contexts/payments/infrastructure/events/consumers/payments-consumer.ts
git commit -m "refactor(payments): move PaymentsConsumer to Payments BC"
```

---

### Task 14: Create InProcessOrderGateway

**Files:**
- Create: `src/contexts/payments/infrastructure/gateways/in-process-order.gateway.ts`

**Step 1: Write the gateway (stub for now, will wire later)**

```typescript
import { Injectable } from '@nestjs/common';
import { IOrderGateway } from '../../application/gateways/order-gateway.interface';

@Injectable()
export class InProcessOrderGateway implements IOrderGateway {
  // Will inject PaymentApprovedHandler after Orders BC is set up
  async markOrderAsPaid(orderId: string, paymentId: string): Promise<void> {
    // TODO: Wire to PaymentApprovedHandler
    throw new Error('Not yet implemented - will be wired in Phase 4');
  }
}
```

**Step 2: Commit**

```bash
git add src/contexts/payments/infrastructure/gateways/in-process-order.gateway.ts
git commit -m "feat(payments): add InProcessOrderGateway stub"
```

---

### Task 15: Create PaymentController

**Files:**
- Create: `src/contexts/payments/infrastructure/controllers/payment.controller.ts`

**Step 1: Write the controller**

```typescript
import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Money } from '../../../../shared/value-objects/money';
import { ProcessPaymentDto } from '../../application/dtos/process-payment.dto';
import { ProcessPaymentService } from '../../application/services/process-payment.service';

@Controller('payments')
export class PaymentController {
  constructor(
    private readonly processPaymentService: ProcessPaymentService,
  ) {}

  @Post()
  async processPayment(@Body() dto: ProcessPaymentDto) {
    const orderId = dto.orderId;
    const amount = new Money(dto.amount, dto.currency);

    const result = await this.processPaymentService.execute(orderId, amount);

    if (!result.success) {
      throw new BadRequestException(result.reason);
    }

    return {
      paymentId: result.paymentId,
      status: 'approved',
      orderId,
    };
  }
}
```

**Step 2: Commit**

```bash
git add src/contexts/payments/infrastructure/controllers/payment.controller.ts
git commit -m "feat(payments): add PaymentController"
```

---

### Task 16: Create PaymentModule

**Files:**
- Create: `src/contexts/payments/infrastructure/modules/payment.module.ts`

**Step 1: Write the module (stub for now)**

```typescript
import { Module } from '@nestjs/common';
import { ProcessPaymentService } from '../../application/services/process-payment.service';
import { PaymentController } from '../controllers/payment.controller';
import { InProcessOrderGateway } from '../gateways/in-process-order.gateway';
import { PaymentsConsumer } from '../events/consumers/payments-consumer';
import { ORDER_GATEWAY } from '../../application/gateways/order-gateway.interface';

@Module({
  imports: [], // Will import OrderModule later
  controllers: [PaymentController],
  providers: [
    ProcessPaymentService,
    PaymentsConsumer,
    {
      provide: ORDER_GATEWAY,
      useClass: InProcessOrderGateway,
    },
  ],
  exports: [PaymentsConsumer],
})
export class PaymentModule {}
```

**Step 2: Commit**

```bash
git add src/contexts/payments/infrastructure/modules/payment.module.ts
git commit -m "feat(payments): add PaymentModule"
```

---

## Phase 4: Relocate Orders BC

### Task 17: Move Order Domain Files

**Files:**
- Move: `src/domain/order/**/*` → `src/contexts/orders/domain/order/**/*`
- Move: `src/domain/shopping-cart/**/*` → `src/contexts/orders/domain/shopping-cart/**/*`
- Move: `src/domain/shared/**/*` → `src/contexts/orders/domain/shared/**/*`

**Step 1: Copy domain files**

```bash
cp -r src/domain/order src/contexts/orders/domain/
cp -r src/domain/shopping-cart src/contexts/orders/domain/
cp -r src/domain/shared src/contexts/orders/domain/
```

**Step 2: Update internal imports within domain files**

For files in `src/contexts/orders/domain/`, update imports that reference `src/domain/` to use relative paths within the new structure.

Example changes:
- `../../shared/` stays as `../../shared/` (now refers to src/shared/)
- `../order/` stays relative
- `../../domain/shared/` becomes `../shared/`

**Step 3: Run TypeScript compiler**

```bash
npm run build
```

Expected: ERRORS (old files still exist, causing duplicates)

**Step 4: Commit (don't delete old files yet)**

```bash
git add src/contexts/orders/domain/
git commit -m "refactor(orders): copy Order domain to Orders BC"
```

---

### Task 18: Move Order Application Files

**Files:**
- Move: `src/application/services/checkout.service.ts` → `src/contexts/orders/application/services/checkout.service.ts`
- Move: `src/application/services/order.service.ts` → `src/contexts/orders/application/services/order.service.ts`
- Move: `src/application/dtos/**/*` → `src/contexts/orders/application/dtos/**/*`
- Move: `src/application/events/handlers/payment-approved.handler.ts` → `src/contexts/orders/application/events/handlers/payment-approved.handler.ts`
- Move: `src/application/gateways/catalog.gateway.interface.ts` → `src/contexts/orders/application/gateways/catalog.gateway.interface.ts`
- Move: `src/application/gateways/pricing.gateway.interface.ts` → `src/contexts/orders/application/gateways/pricing.gateway.interface.ts`
- Move: `src/application/exceptions/**/*` → `src/contexts/orders/application/exceptions/**/*`

**Step 1: Create subdirectories**

```bash
mkdir -p src/contexts/orders/application/services
mkdir -p src/contexts/orders/application/dtos
mkdir -p src/contexts/orders/application/events/handlers
mkdir -p src/contexts/orders/application/gateways
mkdir -p src/contexts/orders/application/exceptions
```

**Step 2: Copy files**

```bash
cp src/application/services/checkout.service.ts src/contexts/orders/application/services/
cp src/application/services/order.service.ts src/contexts/orders/application/services/
cp -r src/application/dtos/* src/contexts/orders/application/dtos/
cp src/application/events/handlers/payment-approved.handler.ts src/contexts/orders/application/events/handlers/
cp src/application/gateways/catalog.gateway.interface.ts src/contexts/orders/application/gateways/
cp src/application/gateways/pricing.gateway.interface.ts src/contexts/orders/application/gateways/
cp -r src/application/exceptions/* src/contexts/orders/application/exceptions/
```

**Step 3: Update imports in these files**

Update all imports to reference new paths:
- Domain imports: `../../domain/`
- Shared imports: `../../../shared/`

**Step 4: Commit**

```bash
git add src/contexts/orders/application/
git commit -m "refactor(orders): copy Order application layer to Orders BC"
```

---

### Task 19: Move Order Infrastructure Files

**Files:**
- Move: `src/infrastructure/controllers/order.controller.ts` → `src/contexts/orders/infrastructure/controllers/order.controller.ts`
- Move: `src/infrastructure/repositories/in-memory-order.repository.ts` → `src/contexts/orders/infrastructure/repositories/in-memory-order.repository.ts`
- Move: `src/infrastructure/gateways/stub-catalog.gateway.ts` → `src/contexts/orders/infrastructure/gateways/stub-catalog.gateway.ts`
- Move: `src/infrastructure/gateways/stub-pricing.gateway.ts` → `src/contexts/orders/infrastructure/gateways/stub-pricing.gateway.ts`

**Step 1: Create subdirectories**

```bash
mkdir -p src/contexts/orders/infrastructure/controllers
mkdir -p src/contexts/orders/infrastructure/repositories
mkdir -p src/contexts/orders/infrastructure/gateways
mkdir -p src/contexts/orders/infrastructure/modules
```

**Step 2: Copy files**

```bash
cp src/infrastructure/controllers/order.controller.ts src/contexts/orders/infrastructure/controllers/
cp src/infrastructure/repositories/in-memory-order.repository.ts src/contexts/orders/infrastructure/repositories/
cp src/infrastructure/gateways/stub-catalog.gateway.ts src/contexts/orders/infrastructure/gateways/
cp src/infrastructure/gateways/stub-pricing.gateway.ts src/contexts/orders/infrastructure/gateways/
```

**Step 3: Update imports in these files**

Update paths appropriately.

**Step 4: Commit**

```bash
git add src/contexts/orders/infrastructure/
git commit -m "refactor(orders): copy Order infrastructure to Orders BC"
```

---

### Task 20: Update OrderController - Remove Payment Endpoint

**Files:**
- Modify: `src/contexts/orders/infrastructure/controllers/order.controller.ts`

**Step 1: Read the current file**

```bash
cat src/contexts/orders/infrastructure/controllers/order.controller.ts
```

**Step 2: Remove the payment endpoint**

Delete the entire `@Post(':id/payment')` method and its handler.

**Step 3: Remove ConfirmPaymentService injection**

Remove from constructor:
```typescript
private readonly confirmPaymentService: ConfirmPaymentService,
```

**Step 4: Remove ConfirmPaymentService import**

Delete the import line for ConfirmPaymentService.

**Step 5: Commit**

```bash
git add src/contexts/orders/infrastructure/controllers/order.controller.ts
git commit -m "refactor(orders): remove payment endpoint from OrderController"
```

---

### Task 21: Create OrderModule in Orders BC

**Files:**
- Create: `src/contexts/orders/infrastructure/modules/order.module.ts`

**Step 1: Copy existing OrderModule**

```bash
cp src/infrastructure/modules/order.module.ts src/contexts/orders/infrastructure/modules/order.module.ts
```

**Step 2: Update imports**

Update all import paths to reference new structure.

**Step 3: Remove PAYMENT_GATEWAY provider**

Delete the provider for PAYMENT_GATEWAY and its import.

**Step 4: Export PaymentApprovedHandler**

Add to exports:
```typescript
exports: [
  ORDER_REPOSITORY,
  PaymentApprovedHandler, // NEW: export for Payments BC
],
```

**Step 5: Commit**

```bash
git add src/contexts/orders/infrastructure/modules/order.module.ts
git commit -m "refactor(orders): create OrderModule in Orders BC with exports"
```

---

## Phase 5: Wire Contexts Together

### Task 22: Update InProcessOrderGateway with Handler Injection

**Files:**
- Modify: `src/contexts/payments/infrastructure/gateways/in-process-order.gateway.ts`

**Step 1: Update the implementation**

```typescript
import { Injectable } from '@nestjs/common';
import { PaymentApprovedHandler } from '../../../orders/application/events/handlers/payment-approved.handler';
import { IOrderGateway } from '../../application/gateways/order-gateway.interface';

@Injectable()
export class InProcessOrderGateway implements IOrderGateway {
  constructor(
    private readonly paymentApprovedHandler: PaymentApprovedHandler,
  ) {}

  async markOrderAsPaid(orderId: string, paymentId: string): Promise<void> {
    await this.paymentApprovedHandler.handle({
      orderId,
      paymentId,
      approvedAmount: 0,
      currency: 'USD',
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Step 2: Commit**

```bash
git add src/contexts/payments/infrastructure/gateways/in-process-order.gateway.ts
git commit -m "feat(payments): wire InProcessOrderGateway to PaymentApprovedHandler"
```

---

### Task 23: Update PaymentModule to Import OrderModule

**Files:**
- Modify: `src/contexts/payments/infrastructure/modules/payment.module.ts`

**Step 1: Add OrderModule import**

```typescript
import { Module } from '@nestjs/common';
import { OrderModule } from '../../../orders/infrastructure/modules/order.module';
import { ProcessPaymentService } from '../../application/services/process-payment.service';
import { PaymentController } from '../controllers/payment.controller';
import { InProcessOrderGateway } from '../gateways/in-process-order.gateway';
import { PaymentsConsumer } from '../events/consumers/payments-consumer';
import { ORDER_GATEWAY } from '../../application/gateways/order-gateway.interface';

@Module({
  imports: [OrderModule],
  controllers: [PaymentController],
  providers: [
    ProcessPaymentService,
    PaymentsConsumer,
    {
      provide: ORDER_GATEWAY,
      useClass: InProcessOrderGateway,
    },
  ],
  exports: [PaymentsConsumer],
})
export class PaymentModule {}
```

**Step 2: Commit**

```bash
git add src/contexts/payments/infrastructure/modules/payment.module.ts
git commit -m "refactor(payments): import OrderModule for cross-context communication"
```

---

### Task 24: Move Cart Module and Related Files

**Files:**
- Move: `src/infrastructure/modules/cart.module.ts` → `src/contexts/orders/infrastructure/modules/cart.module.ts`
- Move: `src/infrastructure/controllers/cart.controller.ts` → `src/contexts/orders/infrastructure/controllers/cart.controller.ts`
- Move: `src/infrastructure/repositories/in-memory-shopping-cart.repository.ts` → `src/contexts/orders/infrastructure/repositories/in-memory-shopping-cart.repository.ts`
- Move: `src/application/services/cart.service.ts` → `src/contexts/orders/application/services/cart.service.ts`

**Step 1: Copy files**

```bash
cp src/infrastructure/modules/cart.module.ts src/contexts/orders/infrastructure/modules/
cp src/infrastructure/controllers/cart.controller.ts src/contexts/orders/infrastructure/controllers/
cp src/infrastructure/repositories/in-memory-shopping-cart.repository.ts src/contexts/orders/infrastructure/repositories/
cp src/application/services/cart.service.ts src/contexts/orders/application/services/
```

**Step 2: Update imports in all copied files**

Update paths to reference new structure.

**Step 3: Commit**

```bash
git add src/contexts/orders/
git commit -m "refactor(orders): move Cart module to Orders BC"
```

---

### Task 25: Move Shared Infrastructure

**Files:**
- Move: `src/infrastructure/events/domain-event-publisher.ts` → `src/contexts/orders/infrastructure/events/domain-event-publisher.ts`
- Move: `src/infrastructure/events/in-memory-message-bus.ts` → `src/shared/message-bus/in-memory-message-bus.ts`
- Move: `src/infrastructure/filters/domain-exception.filter.ts` → `src/contexts/orders/infrastructure/filters/domain-exception.filter.ts`

**Step 1: Copy DomainEventPublisher to Orders BC**

```bash
mkdir -p src/contexts/orders/infrastructure/events
cp src/infrastructure/events/domain-event-publisher.ts src/contexts/orders/infrastructure/events/
```

**Step 2: Copy InMemoryMessageBus to shared**

```bash
cp src/infrastructure/events/in-memory-message-bus.ts src/shared/message-bus/in-memory-message-bus.ts
```

**Step 3: Copy domain exception filter**

```bash
mkdir -p src/contexts/orders/infrastructure/filters
cp src/infrastructure/filters/domain-exception.filter.ts src/contexts/orders/infrastructure/filters/
```

**Step 4: Update imports in copied files**

**Step 5: Commit**

```bash
git add src/contexts/orders/infrastructure/events/
git add src/shared/message-bus/in-memory-message-bus.ts
git add src/contexts/orders/infrastructure/filters/
git commit -m "refactor: move shared infrastructure to appropriate locations"
```

---

### Task 26: Update AppModule

**Files:**
- Modify: `src/app.module.ts`

**Step 1: Update imports**

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CartModule } from './contexts/orders/infrastructure/modules/cart.module';
import { OrderModule } from './contexts/orders/infrastructure/modules/order.module';
import { PaymentModule } from './contexts/payments/infrastructure/modules/payment.module';
import { DomainExceptionFilter } from './contexts/orders/infrastructure/filters/domain-exception.filter';
import { DomainEventPublisher } from './contexts/orders/infrastructure/events/domain-event-publisher';
import { InMemoryMessageBus } from './shared/message-bus/in-memory-message-bus';
import { MESSAGE_BUS } from './shared/message-bus/message-bus.interface';
import { PaymentsConsumer } from './contexts/payments/infrastructure/events/consumers/payments-consumer';

@Module({
  imports: [CartModule, OrderModule, PaymentModule],
  providers: [
    {
      provide: MESSAGE_BUS,
      useClass: InMemoryMessageBus,
    },
    DomainEventPublisher,
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
  ],
})
export class AppModule {}
```

**Step 2: Add OnModuleInit for PaymentsConsumer**

```typescript
import { Module, OnModuleInit } from '@nestjs/common';

export class AppModule implements OnModuleInit {
  constructor(private readonly paymentsConsumer: PaymentsConsumer) {}

  onModuleInit() {
    this.paymentsConsumer.initialize();
  }
}
```

**Step 3: Run TypeScript compiler**

```bash
npm run build
```

Expected: SUCCESS (with duplicate module warnings possibly)

**Step 4: Commit**

```bash
git add src/app.module.ts
git commit -m "refactor: update AppModule to use new context structure"
```

---

## Phase 6: Delete Old Files

### Task 27: Delete Old Domain Files

**Files:**
- Delete: `src/domain/**/*`

**Step 1: Remove old domain directory**

```bash
rm -rf src/domain/
```

**Step 2: Run TypeScript compiler**

```bash
npm run build
```

Expected: SUCCESS

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove old domain directory"
```

---

### Task 28: Delete Old Application Files

**Files:**
- Delete: `src/application/**/*`

**Step 1: Remove old application directory**

```bash
rm -rf src/application/
```

**Step 2: Run TypeScript compiler**

```bash
npm run build
```

Expected: SUCCESS

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove old application directory"
```

---

### Task 29: Delete Old Infrastructure Files

**Files:**
- Delete: `src/infrastructure/**/*`

**Step 1: Remove old infrastructure directory**

```bash
rm -rf src/infrastructure/
```

**Step 2: Run TypeScript compiler**

```bash
npm run build
```

Expected: SUCCESS

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove old infrastructure directory"
```

---

## Phase 7: Update Tests

### Task 30: Update E2E Test Imports - Cart Tests

**Files:**
- Modify: `test/cart.e2e-spec.ts`

**Step 1: Update imports**

Change any imports referencing old paths to new context structure.

**Step 2: Run tests**

```bash
npm run test:e2e test/cart.e2e-spec.ts
```

Expected: PASS

**Step 3: Commit**

```bash
git add test/cart.e2e-spec.ts
git commit -m "test: update cart E2E test imports"
```

---

### Task 31: Update E2E Test - Order Payment Endpoint

**Files:**
- Modify: `test/order.e2e-spec.ts`

**Step 1: Find payment endpoint tests**

Look for tests using `POST /orders/:id/payment`.

**Step 2: Update endpoint and request format**

Change from:
```typescript
const response = await request(app.getHttpServer())
  .post(`/orders/${orderId}/payment`)
  .expect(200);
```

to:
```typescript
const response = await request(app.getHttpServer())
  .post('/payments')
  .send({
    orderId: orderId,
    amount: 150,
    currency: 'USD',
  })
  .expect(201);
```

**Step 3: Update response assertions**

Expect payment-centric response:
```typescript
expect(response.body).toHaveProperty('paymentId');
expect(response.body).toHaveProperty('status', 'approved');
expect(response.body).toHaveProperty('orderId', orderId);
```

**Step 4: Update imports**

Fix any import paths.

**Step 5: Run tests**

```bash
npm run test:e2e test/order.e2e-spec.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add test/order.e2e-spec.ts
git commit -m "test: update order E2E tests for new payment endpoint"
```

---

### Task 32: Update Event-Driven Flow E2E Test

**Files:**
- Modify: `test/event-driven-flow.e2e-spec.ts`

**Step 1: Update imports only**

Fix import paths to reference new structure.

**Step 2: Run tests**

```bash
npm run test:e2e test/event-driven-flow.e2e-spec.ts
```

Expected: PASS (no logic changes, async flow unchanged)

**Step 3: Commit**

```bash
git add test/event-driven-flow.e2e-spec.ts
git commit -m "test: update event-driven flow E2E test imports"
```

---

### Task 33: Update Domain Tests

**Files:**
- Modify: `src/contexts/orders/domain/**/__tests__/*.spec.ts`

**Step 1: Update imports in all test files**

Use find/replace to update import paths within test files.

**Step 2: Run domain tests**

```bash
npm test -- --testPathPattern=src/contexts/orders/domain
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/contexts/orders/domain/
git commit -m "test: update domain test imports"
```

---

### Task 34: Run Full Test Suite

**Files:**
- None (verification step)

**Step 1: Run all tests**

```bash
npm test
```

Expected: ALL PASS

**Step 2: Run E2E tests**

```bash
npm run test:e2e
```

Expected: ALL PASS

**Step 3: Run build**

```bash
npm run build
```

Expected: SUCCESS

**Step 4: Run linter**

```bash
npm run lint
```

Expected: No errors (fix any that appear)

---

## Phase 8: Final Cleanup

### Task 35: Remove .gitkeep Files

**Files:**
- Delete: All `.gitkeep` files created in Phase 1

**Step 1: Remove .gitkeep files**

```bash
find src/contexts -name ".gitkeep" -delete
find src/shared -name ".gitkeep" -delete
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove .gitkeep placeholder files"
```

---

### Task 36: Update tsconfig Paths (if needed)

**Files:**
- Modify: `tsconfig.json` (only if path aliases exist)

**Step 1: Check if path aliases need updating**

```bash
cat tsconfig.json | grep -A 10 "paths"
```

**Step 2: Update paths if needed**

Add or update path aliases for new structure:
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@orders/*": ["src/contexts/orders/*"],
      "@payments/*": ["src/contexts/payments/*"]
    }
  }
}
```

**Step 3: Run build**

```bash
npm run build
```

Expected: SUCCESS

**Step 4: Commit (only if changes made)**

```bash
git add tsconfig.json
git commit -m "chore: update tsconfig paths for new structure"
```

---

### Task 37: Final Verification

**Files:**
- None (verification step)

**Step 1: Run full build**

```bash
npm run build
```

Expected: SUCCESS with no warnings

**Step 2: Run all tests**

```bash
npm test && npm run test:e2e
```

Expected: ALL PASS

**Step 3: Start application**

```bash
npm run start:dev
```

Expected: Application starts without errors

**Step 4: Test endpoints manually**

```bash
# Create cart
curl -X POST http://localhost:3000/carts -H "Content-Type: application/json" -d '{"customerId":"customer-123"}'

# Add item
curl -X POST http://localhost:3000/carts/{cartId}/items -H "Content-Type: application/json" -d '{"productId":"product-1","quantity":2}'

# Checkout
curl -X POST http://localhost:3000/orders/checkout -H "Content-Type: application/json" -d '{...}'

# Process payment (NEW ENDPOINT)
curl -X POST http://localhost:3000/payments -H "Content-Type: application/json" -d '{"orderId":"...","amount":100,"currency":"USD"}'
```

Expected: All endpoints work correctly

---

## Success Criteria Checklist

- [ ] Payments BC exists under `src/contexts/payments/`
- [ ] Orders BC exists under `src/contexts/orders/`
- [ ] Shared kernel exists under `src/shared/`
- [ ] `POST /payments` endpoint works
- [ ] HTTP payment flow works (sync)
- [ ] Async payment flow works (event-driven)
- [ ] All E2E tests pass
- [ ] All unit tests pass
- [ ] Build succeeds with no errors
- [ ] No behavioral changes from user perspective
- [ ] Old directories removed (`src/domain/`, `src/application/`, `src/infrastructure/`)

---

## Rollback Plan

If issues arise:

1. Revert last commit: `git reset --hard HEAD~1`
2. If multiple commits back: `git reset --hard <commit-hash>`
3. Push force to remote (if needed): `git push --force origin payment-context-separation`

Each task is a separate commit, allowing fine-grained rollback.
