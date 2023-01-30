import { IDatabaseResponse } from '../sql.connection';
import { IDemographicRecordAttributes, Demographics } from './demographic.schema';
import utils from '../utils';

const _createRecord = async (data: IDemographicRecordAttributes): Promise<IDatabaseResponse> => {
    let returnValue: IDatabaseResponse = { success: false };
    try {
        const createdEntry = await Demographics.create(data, { raw: false });
        returnValue = utils.constructDatabaseSuccessResponse(createdEntry.toJSON());
    } catch (error: any) {
        returnValue = utils.constructDatabaseErrorResponse(error);
    }
    return returnValue;
};

const _getMissingRecords = async (limit = 1000): Promise<IDatabaseResponse> => {
    let returnValue: IDatabaseResponse = { success: false };
    try {
        const missingRecords = await Demographics.findAll({ where: { country_code: null }, limit });
        returnValue = utils.constructDatabaseSuccessResponse(missingRecords);
    } catch (error: any) {
        returnValue = utils.constructDatabaseErrorResponse(error);
    }
    return returnValue;
};

const _updateRecordByIp = async (ip_address: string, data: object): Promise<IDatabaseResponse> => {
    let returnValue: IDatabaseResponse = { success: false };
    try {
        const updatedEntry = await Demographics.update(data, { where: { ip_address } });
        returnValue = { success: true, data: { affectedRows: updatedEntry[0] } };
    } catch (error: any) {
        returnValue = utils.constructDatabaseErrorResponse(error);
    }
    return returnValue;
};

export {
    Demographics as DemographicModel,
    _createRecord as addNewDemographicsInfo,
    _updateRecordByIp as updateDemographicsInfoByIp,
    _getMissingRecords as getMissingRecords
};