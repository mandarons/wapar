import cron from 'node-cron';
import fs from 'fs';

import { getAppDeployments, getTotalDeployments } from '.';
import appConfig from '../const';
interface IAggregateData {
    createdAt: string;
    totalInstallations?: number | null;
    iCloudDocker?: {
        total: number | null;
    };
    haBouncie?: {
        total: number | null;
    };
};
const getAllAppDeployments = async (data: IAggregateData) => {
    data.iCloudDocker = { total: null };
    let totalDeployments = await getAppDeployments('icloud-drive-docker');
    data.iCloudDocker.total = totalDeployments === false ? null : totalDeployments as number;

    data.haBouncie = { total: null };
    totalDeployments = await getAppDeployments('ha-bouncie');
    data.haBouncie.total = totalDeployments === false ? null : totalDeployments as number;
};

const getAggregateData = async (): Promise<IAggregateData | boolean> => {
    const data: IAggregateData = { totalInstallations: 0, createdAt: Date() };
    const totalDeployments = await getTotalDeployments();
    data.totalInstallations = totalDeployments === false ? null : totalDeployments as number;
    await getAllAppDeployments(data);
    return data;
};

const job = async () => {
    const data = await getAggregateData();
    fs.writeFileSync(appConfig.server.dataFilePath, JSON.stringify(data as object));
    return true;
};

/* istanbul ignore next */
const enableSaveAggregateDataRefresh = (pattern = appConfig.server.saveDataInterval) => cron.schedule(pattern, job);

export default {
    job,
    enableSaveAggregateDataRefresh
};
