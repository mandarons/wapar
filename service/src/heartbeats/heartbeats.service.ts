import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateHeartbeatDto } from './dto/create-heartbeat.dto';

@Injectable()
export class HeartbeatsService {
  constructor(private readonly prisma: PrismaService) {}
  create(createHeartbeatDto: CreateHeartbeatDto) {
    return this.prisma.heartbeat.create({ data: createHeartbeatDto });
  }
}
