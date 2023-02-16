import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IDatabaseResponse } from '../db/db.interface';
import { IInstallationRecordAttributes } from './installation.interface';
import { Installation } from './installation.model';
import utils from '../db/db.utils';
@Injectable()
export class InstallationsService {
    constructor(@InjectModel(Installation) private installationModel: typeof Installation) {}
    async create(data: IInstallationRecordAttributes): Promise<IDatabaseResponse> {
        let returnValue: IDatabaseResponse = { success: false };
        try {
            const createdEntry = await this.installationModel.create(data, {
                raw: false,
            });
            returnValue = utils.constructDatabaseSuccessResponse(createdEntry.toJSON());
        } catch (error: any) {
            returnValue = utils.constructDatabaseErrorResponse(error);
        }
        return returnValue;
    }
    async findByAppName(appName: string): Promise<IDatabaseResponse> {
        let returnValue: IDatabaseResponse = { success: false };
        try {
            const foundEntry = await this.installationModel.findAndCountAll({
                where: { appName },
            });
            returnValue = utils.constructDatabaseSuccessResponse(foundEntry.count);
        } catch (error: any) {
            returnValue = utils.constructDatabaseErrorResponse(error);
        }
        return returnValue;
    }
    async count(): Promise<IDatabaseResponse> {
        let returnValue: IDatabaseResponse = { success: false };
        try {
            const count = await this.installationModel.count();
            returnValue = utils.constructDatabaseSuccessResponse(count);
        } catch (error: any) {
            returnValue = utils.constructDatabaseErrorResponse(error);
        }
        return returnValue;
    }
    async getMissingIPInfo(): Promise<IDatabaseResponse> {
        let returnValue: IDatabaseResponse = { success: false };
        try {
            const records = await this.installationModel.findAll({ where: { countryCode: null }, attributes: ['ipAddress', 'id'], limit: 100, raw: true });
            returnValue = utils.constructDatabaseSuccessResponse(records);
        } catch (error: any) {
            returnValue = utils.constructDatabaseErrorResponse(error);
        }
        return returnValue;
    }
    async patchMissingIPInfo(batch: { id: string; countryCode: string; region: string }[]) {
        let returnValue: IDatabaseResponse = { success: false };
        try {
            await Promise.all(
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
        } catch (error: any) {
            returnValue = utils.constructDatabaseErrorResponse(error);
        }
        return returnValue;
    }
}
