import chai from 'chai';
import chaiHttp from 'chai-http';
import dataUtils from './data.utils';
chai.should();
chai.use(chaiHttp);
const endpoint = '/installations';
describe(endpoint, async () => {
  let server: any;
  before(async () => {
    server = await dataUtils.createServer();
  });
  afterEach(async () => {
    await dataUtils.syncDb(false);
  });
  it('POST with valid data should succeed', async () => {
    const res = await chai.request(server).post(endpoint).send(dataUtils.createInstallationPost());
    res.status.should.be.equal(201);
    res.body.should.have.property('id');
    res.body.id.should.not.be.empty;
  });
  it('POST should fail for invalid data', async () => {
    const res = await chai.request(server).post(endpoint).send({ invalid: 'data' });
    res.status.should.be.equal(500);
  });
  it('GET should return error', async () => {
    const res = await chai.request(server).get(endpoint);
    res.status.should.be.equal(404);
  });
  it('PATCH should return error', async () => {
    const res = await chai.request(server).patch(endpoint).send(dataUtils.createInstallationPost());
    res.status.should.be.equal(404);
  });
  it('PUT should return error', async () => {
    const res = await chai.request(server).put(endpoint).send(dataUtils.createInstallationPost());
    res.status.should.be.equal(404);
  });

  it('DELETE should return error', async () => {
    const res = await chai.request(server).get(endpoint).send(dataUtils.createInstallationPost());
    res.status.should.be.equal(404);
  });
});
