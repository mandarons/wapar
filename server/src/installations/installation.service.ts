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
            const foundEntry = await Installation.findAndCountAll({
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
            const count = await Installation.count();
            returnValue = utils.constructDatabaseSuccessResponse(count);
        } catch (error: any) {
            returnValue = utils.constructDatabaseErrorResponse(error);
        }
        return returnValue;
    }
}
