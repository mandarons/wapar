import { faker } from '@faker-js/faker';
import { IHeartbeatRecordAttributes } from 'src/heartbeats/heartbeat.interface';
import { Heartbeat } from '../src/heartbeats/heartbeat.model';
import { IInstallationRecordAttributes } from 'src/installations/installation.interface';
import { Installation } from '../src/installations/installation.model';
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
const syncDb = async (sync = true) => {
    if (sync) {
        await Installation.sync({ force: true, match: /\*dev/ });
        await Heartbeat.sync({ force: true, match: /\*dev/ });
        return;
    }
    await Installation.drop();
    await Heartbeat.drop();
};
export default {
    appsList,
    randomAppName,
    randomAppVersion,
    createInstallationRecord,
    createHeartbeatRecord,
    syncDb,
};
