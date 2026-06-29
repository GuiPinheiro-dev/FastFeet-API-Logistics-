import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';

@Injectable()
export class RecipientsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateRecipientDto) {
    return this.prisma.recipient.create({ data: dto });
  }

  findAll() {
    return this.prisma.recipient.findMany();
  }

  async findOne(id: string) {
    const recipient = await this.prisma.recipient.findUnique({ where: { id } });
    if (!recipient) throw new NotFoundException('Recipient not found');
    return recipient;
  }

  async update(id: string, dto: Partial<CreateRecipientDto>) {
    await this.findOne(id);
    return this.prisma.recipient.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.recipient.delete({ where: { id } });
  }
}
