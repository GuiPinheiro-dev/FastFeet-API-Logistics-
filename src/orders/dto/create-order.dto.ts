import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  recipientId: string;

  @IsUUID()
  @IsOptional()
  delivererId?: string;
}
