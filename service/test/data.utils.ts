import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { prisma } from '../prisma/seed';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { server } from 'sinon';
// import { IHeartbeatRecordAttributes } from 'src/heartbeats/heartbeat.interface';
// import { Heartbeat } from '../src/heartbeats/heartbeat.model';
// import { IInstallationRecordAttributes } from 'src/installations/installation.interface';
// import { Installation } from '../src/installations/installation.model';
const appsList = ['icloud-drive-docker', 'ha-bouncie'];
const randomAppName = () => faker.helpers.arrayElement(['icloud-drive-docker', 'ha-bouncie']);
const randomAppVersion = () => `${faker.random.numeric()}.${faker.random.numeric()}.${faker.random.numeric()}`;
const createInstallationPost = (appName = randomAppName()) => {
  return {
    appName: appName,
    appVersion: randomAppVersion(),
  };
};
const createInstallationRecord = (appName = randomAppName()) => {
  return {
    ...createInstallationPost(appName),
    ipAddress: faker.internet.ipv4(),
  };
};
const createServer = async () => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter({ ignoreDuplicateSlashes: true, ignoreTrailingSlash: true, trustProxy: true }));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app.getHttpServer();
};
const createHeartbeatRecord = (installationId: string, data: object | undefined = undefined) => {
  return {
    installationId,
    data,
  };
};
const syncDb = async (sync = true) => {
  if (sync) {
    return;
  }
  const deleteInstallations = prisma.installation.deleteMany();
  await prisma.$transaction([deleteInstallations]);
  await prisma.$disconnect();
};
export default {
  createServer,
  appsList,
  randomAppName,
  randomAppVersion,
  createInstallationRecord,
  createInstallationPost,
  createHeartbeatRecord,
  syncDb,
  prisma,
};
