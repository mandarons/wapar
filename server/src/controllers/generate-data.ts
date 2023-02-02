
import { getAppDeployments, getTotalDeployments } from '.';
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

const getAggregateData = async (): Promise<IAggregateData> => {
    const data: IAggregateData = { totalInstallations: 0, createdAt: (new Date()).toUTCString() };
    const totalDeployments = await getTotalDeployments();
    data.totalInstallations = totalDeployments === false ? null : totalDeployments as number;
    await getAllAppDeployments(data);
    return data;
};

export default {
    getAggregateData
};
