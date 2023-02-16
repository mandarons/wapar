import { Body, Controller, Post } from '@nestjs/common';
import { HeartbeatService } from './heartbeat.service';
import { PostHeartbeatDto } from './post.dto';

@Controller('heartbeat')
export class HeartbeatController {
    constructor(private readonly heartbeatService: HeartbeatService) {}
    @Post()
    async newHeartbeat(
        @Body()
        body: PostHeartbeatDto,
    ) {
        const result = await this.heartbeatService.create(body);
        return { id: result.installationId };
    }
}
