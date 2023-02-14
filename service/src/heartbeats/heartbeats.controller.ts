import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HeartbeatsService } from './heartbeats.service';
import { CreateHeartbeatDto } from './dto/create-heartbeat.dto';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { HeartbeatEntity } from './entities/heartbeat.entity';

@Controller('heartbeats')
@ApiTags('heartbeats')
export class HeartbeatsController {
  constructor(private readonly heartbeatsService: HeartbeatsService) {}

  @Post()
  @ApiCreatedResponse({ type: HeartbeatEntity })
  create(@Body() createHeartbeatDto: CreateHeartbeatDto) {
    return this.heartbeatsService.create(createHeartbeatDto);
  }
}
