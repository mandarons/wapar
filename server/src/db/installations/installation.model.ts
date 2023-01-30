import { IDatabaseResponse } from '../sql.connection';
import { IInstallationRecordAttributes, Installations } from './installations.schema';
import utils from '../utils';

const _createRecord = async (data: IInstallationRecordAttributes): Promise<IDatabaseResponse> => {
    let returnValue: IDatabaseResponse = { success: false };
    try {
        delete data.id;
        const createdEntry = await Installations.create(data, { raw: false });
        returnValue = utils.constructDatabaseSuccessResponse(createdEntry.toJSON());
    } catch (error: any) {
        returnValue = utils.constructDatabaseErrorResponse(error);
    }
    return returnValue;
};

const _findRecordsByAppName = async (app_name: string): Promise<IDatabaseResponse> => {
    let returnValue: IDatabaseResponse = { success: false };
    try {
        const foundEntry = await Installations.findAll({ where: { app_name } });
        returnValue = utils.constructDatabaseSuccessResponse(foundEntry);
    } catch (error: any) {
        returnValue = utils.constructDatabaseErrorResponse(error);
    }
    return returnValue;
};
const _countRecord = async (): Promise<IDatabaseResponse> => {
    let returnValue: IDatabaseResponse = { success: false };
    try {
        const count = await Installations.count();
        returnValue = utils.constructDatabaseSuccessResponse(count);
    } catch (error: any) {
        returnValue = utils.constructDatabaseErrorResponse(error);
    }
    return returnValue;
};
export {
    Installations as InstallationModel,
    _createRecord as addNewInstallation,
    _findRecordsByAppName as findInstallationsByAppName,
    _countRecord as countInstallations
};