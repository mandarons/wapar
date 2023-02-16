import { faker } from '@faker-js/faker';
import { IHeartbeatRecordAttributes } from '../src/heartbeats/heartbeat.interface';
import { Heartbeat } from '../src/heartbeats/heartbeat.model';
import { IInstallationRecordAttributes } from '../src/installations/installation.interface';
import { Installation } from '../src/installations/installation.model';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
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
const createServer = async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication<NestFastifyApplication>(
        new FastifyAdapter({
            ignoreDuplicateSlashes: true,
            ignoreTrailingSlash: true,
            trustProxy: true,
        }),
    );
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    return app.getHttpServer();
};
export default {
    appsList,
    randomAppName,
    randomAppVersion,
    createInstallationRecord,
    createHeartbeatRecord,
    syncDb,
    createServer,
};
