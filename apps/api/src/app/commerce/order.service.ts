import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Address, CartLine, CartTotals, Order, OrderStatus, PaymentMethod, PaymentStatus, PlaceOrderRequest, ShippingMethodId, TimelineEntry } from '@ecom/shared/models';
import { codEligibility, computeServiceability, deliverabilityProblem } from '@ecom/shared/models';
import type { Order as OrderRow } from '../../../generated/prisma';
import { AppError, assertNoFieldErrors } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from './cart.service';
import { InventoryService, type StockLine } from './inventory.service';
import { fromJson, toJson } from './json';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[6-9][0-9]{9}$/;
/** Online-payment orders hold their stock for this long before a lazy sweep cancels them and releases it
 * (CM21-04's "release on timeout" — a real value, not the mock's compressed 1-6 minute simulation). */
export const PAYMENT_WINDOW_MINUTES = 15;

export function stockLinesOf(order: Pick<OrderRow, 'lines'>): StockLine[] {
  return fromJson<CartLine[]>(order.lines).map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
}

export interface OwnerContext {
  userId?: string;
  guestToken?: string;
}

function toOrder(row: OrderRow): Order {
  const address: Address = { line1: row.addressLine1, city: row.addressCity, state: row.addressState, pincode: row.addressPincode };
  if (row.addressLine2) address.line2 = row.addressLine2;
  return {
    id: row.id,
    status: row.status as OrderStatus,
    paymentStatus: row.paymentStatus as PaymentStatus,
    paymentMethod: row.paymentMethod as PaymentMethod,
    lines: fromJson<CartLine[]>(row.lines),
    totals: fromJson<CartTotals>(row.totals),
    ...(row.couponCode ? { couponCode: row.couponCode } : {}),
    shippingMethod: row.shippingMethod as ShippingMethodId,
    contact: { name: row.contactName, email: row.contactEmail, phone: row.contactPhone },
    address,
    timeline: fromJson<TimelineEntry[]>(row.timeline),
    createdAt: row.createdAt.toISOString(),
    ...(row.userId ? { userId: row.userId } : {}),
  };
}

function assertDeliverable(pincode: string): void {
  const problem = deliverabilityProblem(pincode, (p) => computeServiceability(p).serviceable);
  if (problem === 'invalid') throw new AppError('validation', 'Enter a valid 6-digit pin code', { pincode: 'Invalid pin code' });
  if (problem === 'not_deliverable') throw new AppError('validation', 'Sorry, we do not deliver to this pin code yet.', { pincode: 'Not deliverable' });
}

/** Orders (BRD 21, CM21-03/CM21-04/CM21-06): the state machine, idempotent placement, and stock holds. */
@Injectable()
export class OrderService {
  constructor(
    private readonly db: PrismaService,
    private readonly cart: CartService,
    private readonly inventory: InventoryService,
  ) {}

  private newOrderId(): string {
    return `ORD-${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  /** Cancels unpaid orders whose payment window ran out, releasing their stock hold. Lazy (run at the
   * top of every order-touching call), like the mock's `cancelExpiredOrders` — no separate cron worker
   * yet (BRD 22/23/24 territory). */
  async sweepExpired(): Promise<void> {
    const now = new Date();
    const expired = await this.db.order.findMany({ where: { status: 'pending_payment', paymentDeadline: { lt: now } } });
    for (const order of expired) {
      await this.inventory.giveBack(stockLinesOf(order));
      const timeline = [...fromJson<TimelineEntry[]>(order.timeline), { status: 'cancelled' as const, label: 'Cancelled: payment window expired', at: now.toISOString() }];
      await this.db.order.update({ where: { id: order.id }, data: { status: 'cancelled', paymentStatus: 'failed', timeline: toJson(timeline) } });
    }
  }

  private matchesOwner(row: OrderRow, owner: OwnerContext): boolean {
    if (owner.userId) return row.userId === owner.userId;
    return !row.userId && !!owner.guestToken && row.guestToken === owner.guestToken;
  }

  async place(ownerKey: string, owner: OwnerContext, request: PlaceOrderRequest): Promise<Order> {
    await this.sweepExpired();
    const existing = await this.db.order.findUnique({ where: { idempotencyKey: request.idempotencyKey } });
    if (existing) return toOrder(existing);

    const fields: Record<string, string> = {};
    if (!request.contact.name.trim()) fields['name'] = 'Name is required';
    if (!EMAIL.test(request.contact.email)) fields['email'] = 'Enter a valid email address';
    if (!PHONE.test(request.contact.phone)) fields['phone'] = 'Enter a valid 10-digit mobile number';
    if (!request.address.line1.trim()) fields['line1'] = 'Address is required';
    if (!request.address.city.trim()) fields['city'] = 'City is required';
    if (!request.address.state.trim()) fields['state'] = 'State is required';
    assertNoFieldErrors(fields);
    assertDeliverable(request.address.pincode);

    const cart = await this.cart.get(ownerKey);
    if (cart.lines.length === 0) throw new AppError('validation', 'Your cart is empty.');
    if (cart.blocked) throw new AppError('validation', 'Some items in your cart are out of stock. Remove them to continue.');
    const cod = request.paymentMethod === 'cod';
    if (cod) {
      const eligibility = codEligibility(request.address.pincode, cart.totals.total.amount);
      if (!eligibility.enabled) throw new AppError('validation', eligibility.reason ?? 'Cash on delivery is not available.');
    }

    // Stock is claimed before the order exists, so two shoppers can never both get the last unit.
    const stockLines: StockLine[] = cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }));
    await this.inventory.take(stockLines);

    const now = new Date();
    const id = this.newOrderId();
    const timeline: TimelineEntry[] = [
      { status: 'placed', label: 'Order placed', at: now.toISOString() },
      ...(cod ? [{ status: 'confirmed' as const, label: 'Order confirmed', at: now.toISOString() }] : []),
    ];
    const data = {
      id,
      status: cod ? 'confirmed' : 'pending_payment',
      paymentStatus: cod ? 'cod' : 'pending',
      paymentMethod: request.paymentMethod,
      userId: owner.userId ?? null,
      guestToken: owner.userId ? null : (owner.guestToken ?? null),
      lines: toJson(cart.lines),
      totals: toJson(cart.totals),
      couponCode: cart.coupon?.code ?? null,
      shippingMethod: cart.shippingMethod,
      contactName: request.contact.name.trim(),
      contactEmail: request.contact.email.trim(),
      contactPhone: request.contact.phone,
      addressLine1: request.address.line1.trim(),
      addressLine2: request.address.line2?.trim() || null,
      addressCity: request.address.city.trim(),
      addressState: request.address.state.trim(),
      addressPincode: request.address.pincode,
      timeline: toJson(timeline),
      notes: toJson([]),
      idempotencyKey: request.idempotencyKey,
      paymentDeadline: cod ? null : new Date(now.getTime() + PAYMENT_WINDOW_MINUTES * 60_000),
    };

    try {
      await this.db.order.create({ data });
    } catch {
      // Unique idempotencyKey race: a concurrent request with the same key won first. Give the stock back
      // and return that order instead of creating a duplicate.
      const raced = await this.db.order.findUnique({ where: { idempotencyKey: request.idempotencyKey } });
      await this.inventory.giveBack(stockLines);
      if (raced) return toOrder(raced);
      throw new AppError('conflict', 'Could not place the order. Please try again.');
    }
    if (cod) await this.cart.replaceWithEmpty(ownerKey, cart.shippingMethod);
    return toOrder(await this.db.order.findUniqueOrThrow({ where: { id } }));
  }

  async get(orderId: string, owner: OwnerContext): Promise<Order> {
    await this.sweepExpired();
    const row = await this.db.order.findUnique({ where: { id: orderId } });
    if (!row || !this.matchesOwner(row, owner)) throw new AppError('not_found', 'Order not found');
    return toOrder(row);
  }

  async list(owner: OwnerContext): Promise<Order[]> {
    await this.sweepExpired();
    const rows = await this.db.order.findMany({
      where: owner.userId ? { userId: owner.userId } : { userId: null, guestToken: owner.guestToken ?? '\0never' },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toOrder);
  }

  /** For the payment module: the raw row (not just the `Order` contract), ownership-checked the same way
   * `get`/`cancel` are — a payment can only ever be initiated/confirmed by the order's own owner. */
  async getRowForOwner(orderId: string, owner: OwnerContext): Promise<OrderRow> {
    const row = await this.db.order.findUnique({ where: { id: orderId } });
    if (!row || !this.matchesOwner(row, owner)) throw new AppError('not_found', 'Order not found');
    return row;
  }

  /** For the webhook handler, which has no browser session/cookie to check ownership against. */
  async findOrThrow(orderId: string): Promise<OrderRow> {
    const row = await this.db.order.findUnique({ where: { id: orderId } });
    if (!row) throw new AppError('not_found', 'Order not found');
    return row;
  }

  toContract(row: OrderRow): Order {
    return toOrder(row);
  }

  async cancel(orderId: string, owner: OwnerContext): Promise<Order> {
    await this.sweepExpired();
    const row = await this.db.order.findUnique({ where: { id: orderId } });
    if (!row || !this.matchesOwner(row, owner)) throw new AppError('not_found', 'Order not found');
    if (row.status === 'cancelled') return toOrder(row);
    if (row.status === 'shipped' || row.status === 'delivered') throw new AppError('validation', 'This order has already shipped and can no longer be cancelled.');
    await this.inventory.giveBack(stockLinesOf(row));
    const timeline = [
      ...fromJson<TimelineEntry[]>(row.timeline).filter((t) => t.status === 'placed' || t.status === 'paid' || t.status === 'confirmed'),
      { status: 'cancelled' as const, label: 'Order cancelled', at: new Date().toISOString() },
    ];
    const updated = await this.db.order.update({
      where: { id: orderId },
      data: { status: 'cancelled', paymentStatus: row.paymentStatus === 'paid' ? 'refund_pending' : row.paymentStatus, timeline: toJson(timeline) },
    });
    return toOrder(updated);
  }
}
