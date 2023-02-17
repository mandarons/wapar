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
    async getMonthlyActive() {
        const data = await this.heartbeatModel.sequelize?.query('select COUNT(DISTINCT installation_id) from "Heartbeat" where created_at  >= (now() - interval \'30 days\')', {
            raw: true,
            plain: true,
        });
        return data ? Number(data.count) : 0;
    }
    async getCountryCodeToCount() {
        const data = await this.heartbeatModel.sequelize?.query(
            'select country_code, COUNT(1) from "Installation" where country_code is not null group by country_code order by 2 desc',
            {
                raw: true,
                plain: false,
            },
        );
        if (data) {
            data[0] = data[0].map(({ country_code, count }) => ({ countryCode: country_code, count: Number(count) }));
            return data[0];
        }
        return [];
    }
}
