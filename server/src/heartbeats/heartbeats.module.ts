import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { HeartbeatController } from './heartbeat.controller';
import { Heartbeat } from './heartbeat.model';
import { HeartbeatService } from './heartbeat.service';

@Module({
    imports: [SequelizeModule.forFeature([Heartbeat])],
    providers: [HeartbeatService],
    controllers: [HeartbeatController],
})
export class HeartbeatsModule {}
