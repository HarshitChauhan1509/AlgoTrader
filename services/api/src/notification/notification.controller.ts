import { Controller, Get, Param, Put, UseGuards, Req } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getNotifications(@Req() req: any) {
    return this.prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  @Put(':id/read')
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    return this.prisma.notification.update({
      where: { id, userId: req.user.userId },
      data: { status: 'READ', readAt: new Date() },
    });
  }

  @Put('read-all')
  async markAllAsRead(@Req() req: any) {
    return this.prisma.notification.updateMany({
      where: { userId: req.user.userId, status: 'UNREAD' },
      data: { status: 'READ', readAt: new Date() },
    });
  }
}
