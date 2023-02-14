import { Module } from '@nestjs/common';
import { HeartbeatsService } from './heartbeats.service';
import { HeartbeatsController } from './heartbeats.controller';

@Module({
  controllers: [HeartbeatsController],
  providers: [HeartbeatsService],
  exports: [HeartbeatsService],
})
export class HeartbeatsModule {}
