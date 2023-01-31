import { addNewDemographicsInfo, addNewInstallation, countInstallations, findInstallationsByAppName } from '../db';
import { IDemographicRecordAttributes } from '../db/demographics/demographic.schema';
import { IInstallationRecordAttributes, IInstallationRecordInstance } from '../db/installations/installations.schema';

import { addNewHeartbeat } from '../db/heartbeats/heartbeat.model';


interface IHeartbeatRecord {
    installation_id: string;
    app_name: string;
    app_version: string;
};
const recordNewHeartbeat = async (data: IHeartbeatRecord): Promise<boolean> => {
    const result = await addNewHeartbeat(data);
    return result.success;
};

const recordNewDeployment = async (app_name: string, app_version: string, ip_address: string | undefined, previous_installation_id: string | null = null): Promise<boolean> => {
    const installationRecord: IInstallationRecordAttributes = { app_name, app_version };
    if (previous_installation_id) {
        installationRecord.previous_id = previous_installation_id;
    }
    let result = await addNewInstallation(installationRecord);
    if (!result.success || ip_address === undefined) {
        return false;
    }
    const demographicRecord: IDemographicRecordAttributes = { installation_id: (result.values as { id: string; }).id, ip_address };
    result = await addNewDemographicsInfo(demographicRecord);
    return result.success;
};

const getTotalDeployments = async (): Promise<number | boolean> => {
    const result = await countInstallations();
    if (!result.success) {
        return false;
    }
    return result.values as number;
};

const getAppDeployments = async (app_name: string): Promise<number | boolean> => {
    const result = await findInstallationsByAppName(app_name);
    return !result.success ? false : (result.values as IInstallationRecordInstance[]).length;
};

export {
    recordNewDeployment,
    getTotalDeployments,
    getAppDeployments,
    recordNewHeartbeat
};