import chai from 'chai';
import chaiHttp from 'chai-http';
import Sinon from 'sinon';
import dataUtils from './data.utils';

chai.should();
chai.use(chaiHttp);
const endpoint = '/usage';
describe(endpoint, async () => {
  let server: any;
  before(async () => {
    server = await dataUtils.createServer();
  });
  describe('GET', async () => {
    afterEach(async () => {
      Sinon.restore();
      await dataUtils.syncDb(false);
    });
    it('should return empty data', async () => {
      const res = await chai.request(server).get(endpoint);
      res.status.should.be.equal(200);
      res.body.totalInstallations.should.be.equal(0);
      res.body.iCloudDocker.total.should.be.equal(0);
      res.body.haBouncie.total.should.be.equal(0);
    });
    it('should return non-empty data', async () => {
      await dataUtils.prisma.installation.create({ data: dataUtils.createInstallationRecord(dataUtils.appsList[0]) });
      await dataUtils.prisma.installation.create({ data: dataUtils.createInstallationRecord(dataUtils.appsList[1]) });
      const res = await chai.request(server).get(endpoint);
      res.status.should.be.equal(200);
      res.body.totalInstallations.should.be.equal(2);
      res.body.iCloudDocker.total.should.be.equal(1);
      res.body.haBouncie.total.should.be.equal(1);
    });
    it('should return empty data in case of internal failure', async () => {
      Sinon.stub(dataUtils.prisma.installation, 'count').throws({ errors: [{ message: 'Exception occcurred.' }] });
      const res = await chai.request(server).get(endpoint);
      res.status.should.be.equal(200);
      Sinon.restore();
    });
  });
  it('POST should return error', async () => {
    const res = await chai.request(server).post(endpoint).send({ valid: 'data' });
    res.status.should.be.equal(404);
  });
  it('PUT should return error', async () => {
    const res = await chai.request(server).put(endpoint).send({ valid: 'data' });
    res.status.should.be.equal(404);
  });
  it('DELETE should return error', async () => {
    const res = await chai.request(server).delete(endpoint).send({ valid: 'data' });
    res.status.should.be.equal(404);
  });
});
