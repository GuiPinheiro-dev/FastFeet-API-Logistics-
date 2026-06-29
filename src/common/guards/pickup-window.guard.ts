import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class PickupWindowGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const start = parseInt(process.env.PICKUP_START_HOUR ?? '8', 10);
    const end = parseInt(process.env.PICKUP_END_HOUR ?? '18', 10);
    const hour = new Date().getHours();

    if (hour < start || hour >= end) {
      throw new ForbiddenException(
        `Pickups are only allowed between ${start}:00 and ${end}:00`,
      );
    }

    return true;
  }
}
