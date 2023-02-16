import chai from 'chai';
import chaiHttp from 'chai-http';
import dataUtils from '../data.utils';
import { Installation } from '../../src/installations/installation.model';
chai.should();
chai.use(chaiHttp);
const ENDPOINT = '/api/heartbeat';

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
    it('POST should succeed', async () => {
        const record = await Installation.create(dataUtils.createInstallationRecord(dataUtils.appsList[0]));
        const res = await chai.request(server).post(ENDPOINT).send(dataUtils.createHeartbeatRecord(record.id));
        res.status.should.be.equal(201);
        res.body.should.have.property('id');
        res.body.id.should.be.not.empty;
    });
    it('POST should fail for non-existent installation', async () => {
        const res = await chai.request(server).post(ENDPOINT).send(dataUtils.createHeartbeatRecord('f6a16ff7-4a31-11eb-be7b-8344edc8f36b'));
        res.status.should.be.equal(404);
    });
    it('POST should fail for invalid data', async () => {
        await Installation.create(dataUtils.createInstallationRecord(dataUtils.appsList[0]));
        const res = await chai.request(server).post(ENDPOINT).send({ invalid: 'data' });
        res.status.should.be.equal(400);
    });
    it('GET should return error', async () => {
        const res = await chai.request(server).get(ENDPOINT);
        res.status.should.be.equal(404);
    });
    it('PUT should return error', async () => {
        const record = await Installation.create(dataUtils.createInstallationRecord(dataUtils.appsList[0]));
        const res = await chai.request(server).put(ENDPOINT).send(dataUtils.createHeartbeatRecord(record.id));
        res.status.should.be.equal(404);
    });
    it('DELETE should return error', async () => {
        const record = await Installation.create(dataUtils.createInstallationRecord(dataUtils.appsList[0]));
        const res = await chai.request(server).delete(ENDPOINT).send(dataUtils.createHeartbeatRecord(record.id));
        res.status.should.be.equal(404);
    });
});
