import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IInstallationRecordAttributes } from './installation.interface';
import { Installation } from './installation.model';
@Injectable()
export class InstallationsService {
    constructor(@InjectModel(Installation) private installationModel: typeof Installation) {}
    async create(data: IInstallationRecordAttributes) {
        return this.installationModel.create(data, { raw: true });
    }
    async findById(id: string) {
        return await this.installationModel.findOne({ where: { id }, raw: true });
    }
    async findByAppName(appName: string) {
        return await this.installationModel.count({ where: { appName } });
    }
    async count() {
        return await this.installationModel.count();
    }
    async getMissingIPInfo() {
        return await this.installationModel.findAll({ where: { countryCode: null }, attributes: ['ipAddress', 'id'], limit: 100, raw: true });
    }
    async patchMissingIPInfo(batch: { id: string; countryCode: string; region: string }[]) {
        return await Promise.all(
            batch.map(async (e) =>
                this.installationModel.update(
                    {
                        countryCode: e.countryCode,
                        region: e.region,
                    },
                    {
                        where: {
                            id: e.id,
                        },
                    },
                ),
            ),
        );
    }
}
