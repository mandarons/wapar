import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InstallationsService } from '../installations/installation.service';
import { IHeartbeatRecordAttributes } from './heartbeat.interface';
import { Heartbeat } from './heartbeat.model';

@Injectable()
export class HeartbeatService {
    constructor(@InjectModel(Heartbeat) private readonly heartbeatModel: typeof Heartbeat, private readonly installationService: InstallationsService) {}
    async create(data: IHeartbeatRecordAttributes) {
        const installationExists = await this.installationService.findById(data.installationId);
        if (installationExists) {
            return await this.heartbeatModel.create(data, { raw: true });
        }
        throw new HttpException('Installation not found.', HttpStatus.NOT_FOUND);
    }
}
