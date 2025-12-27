# API Endpoints Reference

## Shopping Cart Management (Lesson 1)

### POST /carts
Create new shopping cart.

**Request**: Empty body or optional customer info
**Response**: Cart ID and initial state
**Status**: 201 Created

### POST /carts/:id/items
Add item to cart.

**Path Parameters**:
- `id` - Cart ID

**Request Body**:
```json
{
  "productId": "string",
  "quantity": number
}
```

**Response**: Updated cart
**Status**: 200 OK
**Errors**: 400 (invalid quantity), 404 (cart not found)

### PATCH /carts/:id/items/:productId
Update item quantity.

**Path Parameters**:
- `id` - Cart ID
- `productId` - Product ID

**Request Body**:
```json
{
  "quantity": number
}
```

**Response**: Updated cart
**Status**: 200 OK
**Errors**: 400 (invalid quantity), 404 (cart/item not found)

### DELETE /carts/:id/items/:productId
Remove item from cart.

**Path Parameters**:
- `id` - Cart ID
- `productId` - Product ID

**Response**: Updated cart
**Status**: 200 OK
**Errors**: 404 (cart/item not found)

### GET /carts/:id
Retrieve cart details.

**Path Parameters**:
- `id` - Cart ID

**Response**: Complete cart with items
**Status**: 200 OK
**Errors**: 404 (cart not found)

---

## Order Management (Lessons 2-4)

### POST /orders/checkout
Transform cart into order.

**Request Body**:
```json
{
  "cartId": "string",
  "shippingAddress": {
    "street": "string",
    "city": "string",
    "state": "string",
    "zipCode": "string",
    "country": "string"
  }
}
```

**Response**: Order in `AwaitingPayment` state
**Status**: 201 Created
**Errors**: 400 (empty cart), 404 (cart not found)

**Lesson**: Introduced in Lesson 2

### GET /orders/:id
Retrieve order details.

**Path Parameters**:
- `id` - Order ID

**Response**: Complete order with items, state, and metadata
**Status**: 200 OK
**Errors**: 404 (order not found)

**Lesson**: Introduced in Lesson 2

### POST /orders/:id/pay
Confirm payment for order.

**Path Parameters**:
- `id` - Order ID

**Request Body**:
```json
{
  "paymentMethod": "string",
  "paymentDetails": {}
}
```

**Response**: Updated order in `Paid` state
**Status**: 200 OK
**Errors**: 400 (invalid state), 404 (order not found), 402 (payment failed)

**Lesson**: Introduced in Lesson 3

**Evolution**:
- **Lesson 3**: Synchronous payment via `PaymentGateway`
- **Lesson 4**: Triggers event flow, payment processed asynchronously

**Note**: In Lesson 4, this endpoint still exists but the backend implementation is event-driven. The HTTP response may indicate "payment processing" rather than immediate success/failure.

### POST /orders/:id/cancel
Cancel order.

**Path Parameters**:
- `id` - Order ID

**Request Body**:
```json
{
  "reason": "string"
}
```

**Response**: Updated order in `Cancelled` state
**Status**: 200 OK
**Errors**: 400 (cannot cancel in current state), 404 (order not found)

**Lesson**: Introduced in Lesson 3

---

## Implementation Notes

### Lesson Evolution
The API interface remains stable across lessons, but the backend implementation evolves:

**Lesson 1**: Cart management with in-memory storage
**Lesson 2**: Checkout flow with pricing via domain service
**Lesson 3**: Payment and cancellation with synchronous gateways
**Lesson 4**: Event-driven asynchronous processing (same HTTP interface)

### Error Handling
All endpoints should return appropriate HTTP status codes:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input or business rule violation
- `402 Payment Required` - Payment failed (Lesson 3+)
- `404 Not Found` - Resource not found
- `409 Conflict` - State conflict (e.g., trying to pay already paid order)
- `500 Internal Server Error` - Unexpected errors

### NestJS Implementation
Endpoints are implemented using NestJS controllers with proper decorators:
- `@Controller()` for routing
- `@Post()`, `@Get()`, `@Patch()`, `@Delete()` for HTTP methods
- `@Param()` for path parameters
- `@Body()` for request bodies
- Proper validation with class-validator

**Code reference**: (controllers to be implemented in infrastructure/presentation layer)

## Related Documentation
- Shopping Cart aggregate: `/docs/ddd-patterns/aggregates.md`
- Order state machine: `/docs/domain/order-state-machine.md`
- Application services: `/docs/ddd-patterns/application-services.md`
