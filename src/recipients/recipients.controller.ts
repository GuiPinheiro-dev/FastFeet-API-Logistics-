import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RecipientsService } from './recipients.service';
import { CreateRecipientDto } from './dto/create-recipient.dto';

@Controller('recipients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RecipientsController {
  constructor(private recipientsService: RecipientsService) {}

  @Post()
  create(@Body() dto: CreateRecipientDto) {
    return this.recipientsService.create(dto);
  }

  @Get()
  findAll() {
    return this.recipientsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recipientsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRecipientDto>) {
    return this.recipientsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recipientsService.remove(id);
  }
}
