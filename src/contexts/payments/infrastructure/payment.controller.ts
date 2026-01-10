import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { Money } from '../../../shared/value-objects/money';
import { ProcessPaymentDto } from '../application/process-payment.dto';
import { ProcessPaymentService } from '../application/process-payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly processPaymentService: ProcessPaymentService) {}

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
