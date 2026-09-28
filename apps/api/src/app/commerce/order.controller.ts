import { Body, Controller, Get, HttpCode, Inject, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Order, PlaceOrderRequest } from '@ecom/shared/models';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import type { Request, Response } from 'express';
import { CsrfGuard, OptionalAuthGuard, OptionalUser, type AuthUser } from '../common/auth';
import { API_CONFIG, type ApiConfig } from '../config';
import { ensureGuestCartToken, ownerKeyFor, readGuestCartToken } from './guest-cart-cookie';
import { OrderService, type OwnerContext } from './order.service';

export class ContactDto {
  @IsString() @MaxLength(120) name!: string;
  @IsString() @MaxLength(200) email!: string;
  @IsString() @MaxLength(20) phone!: string;
}

export class AddressDto {
  @IsString() @MaxLength(200) line1!: string;
  @IsOptional() @IsString() @MaxLength(200) line2?: string;
  @IsString() @MaxLength(100) city!: string;
  @IsString() @MaxLength(100) state!: string;
  @IsString() @MaxLength(10) pincode!: string;
}

export class PlaceOrderDto implements PlaceOrderRequest {
  @IsString() @MaxLength(100) idempotencyKey!: string;
  @ValidateNested() @Type(() => ContactDto) contact!: ContactDto;
  @ValidateNested() @Type(() => AddressDto) address!: AddressDto;
  @IsIn(['razorpay', 'cod']) paymentMethod!: 'razorpay' | 'cod';
}

/** Orders (BRD 21, CM21-03/CM21-06), guest or signed in — same `OptionalAuthGuard` pattern as the cart. */
@ApiTags('orders')
@Controller('orders')
@UseGuards(OptionalAuthGuard)
export class OrderController {
  constructor(
    private readonly orders: OrderService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  private owner(user: AuthUser | undefined, guestToken: string): OwnerContext {
    return user ? { userId: user.id } : { guestToken };
  }

  @Post()
  @UseGuards(CsrfGuard)
  place(@OptionalUser() user: AuthUser | undefined, @Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: PlaceOrderDto): Promise<Order> {
    const guestToken = ensureGuestCartToken(req, res, this.config.production);
    const ownerKey = ownerKeyFor(user?.id, guestToken);
    return this.orders.place(ownerKey, this.owner(user, guestToken), body);
  }

  @Get(':id')
  get(@OptionalUser() user: AuthUser | undefined, @Req() req: Request, @Param('id') id: string): Promise<Order> {
    return this.orders.get(id, this.owner(user, readGuestCartToken(req) ?? ''));
  }

  @Get()
  list(@OptionalUser() user: AuthUser | undefined, @Req() req: Request): Promise<Order[]> {
    return this.orders.list(this.owner(user, readGuestCartToken(req) ?? ''));
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  cancel(@OptionalUser() user: AuthUser | undefined, @Req() req: Request, @Param('id') id: string): Promise<Order> {
    return this.orders.cancel(id, this.owner(user, readGuestCartToken(req) ?? ''));
  }
}
