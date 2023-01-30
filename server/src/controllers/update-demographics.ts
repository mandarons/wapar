import cron from 'node-cron';
import appConfig, { ipInfoAPIURL, ipInfoBatchSize } from '../const';
import { getMissingRecords, updateDemographicsInfoByIp } from '../db/demographics/demographic.model';
import { IDemographicRecordInstance } from '../db/demographics/demographic.schema';
import axios, { AxiosResponse } from 'axios';
export interface IIPInfoResponse {
    country: string;
    region: string;
    city: string;
    query: string;
};

const getIPInfo = async (ipList: string[]): Promise<IIPInfoResponse[]> => {
    const ipInfo: IIPInfoResponse[] = [];
    for (let index = 0; index < ipList.length; index += ipInfoBatchSize) {
        const chunk = ipList.slice(index, index + ipInfoBatchSize);
        const response: AxiosResponse = await axios.post(ipInfoAPIURL, chunk);
        if (response.status !== 200) {
            console.error(`Failed to get IP info for a batch. Continuing with the next batch ...`);
        } else {
            ipInfo.push(response.data);
        }
    }
    return ipInfo;
};

const job = async () => {
    const missingRecords = await getMissingRecords();
    if (missingRecords.success === false) {
        console.error(`Failed to get missing demographics - ${missingRecords.errorMessage}.`);
        return false;
    }
    const ipList = (missingRecords.values as IDemographicRecordInstance[]).map(record => record.ip_address);
    const ipInfo = await getIPInfo(ipList);
    for await (const info of ipInfo as IIPInfoResponse[]) {
        // update demographics database
        const result = await updateDemographicsInfoByIp(info.query, { country_code: info.country, region: info.region, city: info.city });
        if (result.success === false) {
            console.error(`Failed to update demographics for ${info.query} - ${result.errorMessage}.`);
        }
    }
    return true;
};
/* istanbul ignore next */
const enableDemographicsRefresh = (pattern = appConfig.server.refreshDemographicsInterval) => cron.schedule(pattern, job);

export default {

    job,
    enableDemographicsRefresh
};