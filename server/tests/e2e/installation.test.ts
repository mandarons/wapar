import chai from 'chai';
import chaiHttp from 'chai-http';
import dataUtils from '../data.utils';
chai.should();
chai.use(chaiHttp);
const ENDPOINT = '/api/installation';
describe(ENDPOINT, async () => {
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
    it('POST with valid data should succeed', async () => {
        const res = await chai.request(server).post(ENDPOINT).send(dataUtils.createInstallationRecord());
        res.status.should.be.equal(201);
        res.body.should.have.property('id');
        res.body.id.should.not.be.empty;
    });
    it('POST should fail for invalid data', async () => {
        const res = await chai.request(server).post(ENDPOINT).send({ invalid: 'data' });
        res.status.should.be.equal(400);
    });
    it('GET should return error', async () => {
        const res = await chai.request(server).get(ENDPOINT);
        res.status.should.be.equal(404);
    });
    it('PUT should return error', async () => {
        const res = await chai.request(server).put(ENDPOINT).send(dataUtils.createInstallationRecord());
        res.status.should.be.equal(404);
    });
    it('DELETE should return error', async () => {
        const res = await chai.request(server).get(ENDPOINT).send(dataUtils.createInstallationRecord());
        res.status.should.be.equal(404);
    });
});
