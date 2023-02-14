import chai from 'chai';
import chaiHttp from 'chai-http';
import dataUtils from './data.utils';
chai.should();
chai.use(chaiHttp);
const endpoint = '/heartbeats';
describe(endpoint, async () => {
  let server: any;
  before(async () => {
    server = await dataUtils.createServer();
  });
  beforeEach(async () => {
    await dataUtils.syncDb();
  });
  afterEach(async () => {
    await dataUtils.syncDb(false);
  });
  it('POST should succeed', async () => {
    const record = await dataUtils.prisma.installation.create({ data: dataUtils.createInstallationRecord(dataUtils.appsList[0]) });
    const res = await chai.request(server).post(endpoint).send(dataUtils.createHeartbeatRecord(record.id));
    res.status.should.be.equal(201);
  });
  it('POST should fail for invalid data', async () => {
    await dataUtils.prisma.installation.create({ data: dataUtils.createInstallationRecord(dataUtils.appsList[0]) });
    const res = await chai.request(server).post(endpoint).send({ invalid: 'data' });
    res.status.should.be.equal(500);
  });
  it('GET should return error', async () => {
    const res = await chai.request(server).get(endpoint);
    res.status.should.be.equal(404);
  });
  it('PUT should return error', async () => {
    const record = await dataUtils.prisma.installation.create({ data: dataUtils.createInstallationRecord(dataUtils.appsList[0]) });
    const res = await chai.request(server).put(endpoint).send(dataUtils.createHeartbeatRecord(record.id));
    res.status.should.be.equal(404);
  });
  it('DELETE should return error', async () => {
    const record = await dataUtils.prisma.installation.create({ data: dataUtils.createInstallationRecord(dataUtils.appsList[0]) });
    const res = await chai.request(server).delete(endpoint).send(dataUtils.createHeartbeatRecord(record.id));
    res.status.should.be.equal(404);
  });
});
