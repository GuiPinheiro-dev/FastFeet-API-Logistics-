import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PICKED_UP'],
  PICKED_UP: ['DELIVERED', 'RETURNED'],
  DELIVERED: [],
  RETURNED: [],
};

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    const recipient = await this.prisma.recipient.findUnique({
      where: { id: dto.recipientId },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    return this.prisma.order.create({ data: dto, include: { recipient: true } });
  }

  async findAll(user: User) {
    if (user.role === Role.ADMIN) {
      return this.prisma.order.findMany({ include: { recipient: true, deliverer: { select: { id: true, name: true, cpf: true } } } });
    }

    return this.prisma.order.findMany({
      where: { delivererId: user.id },
      include: { recipient: true },
    });
  }

  async findOne(id: string, user: User) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { recipient: true, statusLogs: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (user.role === Role.DELIVERER && order.delivererId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  async pickup(orderId: string, deliverer: User) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    this.assertTransition(order.status, 'PICKED_UP');

    const maxPickups = parseInt(process.env.MAX_PICKUPS_PER_DAY ?? '10', 10);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayPickups = await this.prisma.pickup.count({
      where: {
        delivererId: deliverer.id,
        pickedUpAt: { gte: todayStart },
      },
    });

    if (todayPickups >= maxPickups) {
      throw new BadRequestException(
        `Daily pickup limit of ${maxPickups} reached`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'PICKED_UP', delivererId: deliverer.id },
      }),
      this.prisma.pickup.create({
        data: { orderId, delivererId: deliverer.id },
      }),
      this.prisma.orderStatusLog.create({
        data: { orderId, from: order.status, to: 'PICKED_UP' },
      }),
    ]);

    return updated;
  }

  async deliver(orderId: string, deliverer: User, photoUrl: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.delivererId !== deliverer.id) {
      throw new ForbiddenException('You can only deliver orders assigned to you');
    }

    this.assertTransition(order.status, 'DELIVERED');

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'DELIVERED', photoUrl },
      }),
      this.prisma.orderStatusLog.create({
        data: { orderId, from: order.status, to: 'DELIVERED' },
      }),
    ]);

    return updated;
  }

  async returnOrder(orderId: string, deliverer: User) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.delivererId !== deliverer.id) {
      throw new ForbiddenException('You can only return orders assigned to you');
    }

    this.assertTransition(order.status, 'RETURNED');

    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: 'RETURNED' },
      }),
      this.prisma.orderStatusLog.create({
        data: { orderId, from: order.status, to: 'RETURNED' },
      }),
    ]);

    return updated;
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    await this.prisma.order.delete({ where: { id } });
  }

  private assertTransition(from: OrderStatus, to: OrderStatus) {
    if (!VALID_TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(
        `Cannot transition order from ${from} to ${to}`,
      );
    }
  }
}
