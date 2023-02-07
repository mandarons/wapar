import { faker } from '@faker-js/faker';
import { IHeartbeatRecordAttributes } from 'src/heartbeats/heartbeat.interface';
import { IInstallationRecordAttributes } from 'src/installations/installation.interface';
const appsList = ['icloud-drive-docker', 'ha-bouncie'];
const randomAppName = () => faker.helpers.arrayElement(['icloud-drive-docker', 'ha-bouncie']);
const randomAppVersion = () => `${faker.random.numeric()}.${faker.random.numeric()}.${faker.random.numeric()}`;
const createInstallationRecord = (appName = randomAppName()): IInstallationRecordAttributes => {
    return {
        appName,
        appVersion: randomAppVersion(),
        ipAddress: faker.internet.ipv4(),
    };
};
const createHeartbeatRecord = (installationId: string, data: object | null = null): IHeartbeatRecordAttributes => {
    return {
        installationId,
        data,
    };
};

export default {
    appsList,
    randomAppName,
    randomAppVersion,
    createInstallationRecord,
    createHeartbeatRecord,
};
