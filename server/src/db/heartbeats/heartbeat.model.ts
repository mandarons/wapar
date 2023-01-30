import { IDatabaseResponse } from '../sql.connection';
import { IHeartbeatRecordAttributes, Heartbeats } from './heartbeat.schema';

const _createRecord = async (data: IHeartbeatRecordAttributes): Promise<IDatabaseResponse> => {
    let returnValue: IDatabaseResponse = { success: false };
    try {
        delete data.id;
        const createdEntry = await Heartbeats.create(data, { raw: false });
        returnValue.success = true;
        returnValue.values = createdEntry.toJSON();
    } catch (error: any) {
        returnValue = {
            success: false,
            errorMessage: error.errors[0].message,
            data: error
        };
    }
    return returnValue;
};

export {
    _createRecord as addNewHeartbeat
};