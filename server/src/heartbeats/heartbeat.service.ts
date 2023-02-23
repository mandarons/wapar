import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { InstallationsService } from '../installations/installation.service';
import { IHeartbeatRecordAttributes } from './heartbeat.interface';
import { Heartbeat } from './heartbeat.model';

@Injectable()
export class HeartbeatService {
    constructor(@InjectModel(Heartbeat) private readonly heartbeatModel: typeof Heartbeat, private readonly installationService: InstallationsService) {}
    async isRecordCreatedToday() {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        return this.heartbeatModel.findOne({
            where: {
                createdAt: {
                    [Op.between]: [todayStart, todayEnd],
                },
            },
        });
    }
    async create(data: IHeartbeatRecordAttributes) {
        const installationExists = await this.installationService.findById(data.installationId);
        if (installationExists) {
            if (!(await this.isRecordCreatedToday())) {
                return await this.heartbeatModel.create(data, { raw: true });
            }
            return { installationId: data.installationId };
        }
        throw new HttpException('Installation not found.', HttpStatus.NOT_FOUND);
    }
    async getMonthlyActive() {
        const data = await this.heartbeatModel.sequelize?.query('select COUNT(DISTINCT installation_id) from "Heartbeat" where created_at  >= (now() - interval \'30 days\')', {
            raw: true,
            plain: true,
        });
        return data ? Number(data.count) : 0;
    }
}
