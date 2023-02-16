import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IHeartbeatRecordAttributes } from './heartbeat.interface';
import { Heartbeat } from './heartbeat.model';

@Injectable()
export class HeartbeatService {
    constructor(@InjectModel(Heartbeat) private readonly heartbeatModel: typeof Heartbeat) {}
    async create(data: IHeartbeatRecordAttributes) {
        return await this.heartbeatModel.create(data, { raw: true });
    }
}
