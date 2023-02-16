import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InstallationsModule } from '../installations/installations.module';
import { HeartbeatController } from './heartbeat.controller';
import { Heartbeat } from './heartbeat.model';
import { HeartbeatService } from './heartbeat.service';

@Module({
    imports: [SequelizeModule.forFeature([Heartbeat]), InstallationsModule],
    providers: [HeartbeatService],
    controllers: [HeartbeatController],
    exports: [HeartbeatService],
})
export class HeartbeatsModule {}
