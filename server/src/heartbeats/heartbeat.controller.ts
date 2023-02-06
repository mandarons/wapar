import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';
import { PostHeartbeatDto } from './post.dto';

@Controller('/api/heartbeat')
export class HeartbeatController {
  constructor(private readonly heartbeatService: HeartbeatService) {}
  @Post()
  async newHeartbeat(
    @Body()
    body: PostHeartbeatDto,
  ) {
    const result = await this.heartbeatService.create(body);
    if (result.success === false) {
      throw new HttpException(
        'Failed to record.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return { message: 'All good.' };
  }
}
