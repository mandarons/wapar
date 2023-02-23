import chai from 'chai';
import chaiHttp from 'chai-http';
import { Installation } from '../../src/installations/installation.model';
import utils from '../data.utils';
import Sinon from 'sinon';
import dataUtils from '../data.utils';
import { Heartbeat } from '../../src/heartbeats/heartbeat.model';
import axios from 'axios';

chai.should();
chai.use(chaiHttp);
const ENDPOINT = '/api/usage';
describe(ENDPOINT, async () => {
    let server: any;
    before(async () => {
        server = await dataUtils.createServer();
    });
    describe('GET', async () => {
        beforeEach(async () => {
            await dataUtils.syncDb();
        });
        afterEach(async () => {
            Sinon.restore();
            await dataUtils.syncDb(false);
        });
        it('should return empty data', async () => {
            const res = await chai.request(server).get(ENDPOINT);
            res.status.should.be.equal(200);
            res.body.countryToCount.length.should.be.equal(0);
            res.body.totalInstallations.should.be.equal(0);
            res.body.monthlyActive.should.be.equal(0);
            res.body.iCloudDocker.total.should.be.equal(0);
            res.body.haBouncie.total.should.be.equal(0);
        });
        it('should return non-empty data', async () => {
            Sinon.stub(axios, 'post').callsFake(dataUtils.fakeIPInfoPost);
            let record = await Installation.create(utils.createInstallationRecordWithGeo(utils.appsList[0]));
            await Heartbeat.create(utils.createHeartbeatRecord(record.id));
            record = await Installation.create(utils.createInstallationRecordWithGeo(utils.appsList[1]));
            await Heartbeat.create(utils.createHeartbeatRecord(record.id));
            await Heartbeat.create(utils.createHeartbeatRecord(record.id));
            const res = await chai.request(server).get(ENDPOINT);
            res.status.should.be.equal(200);
            res.body.totalInstallations.should.be.equal(2);
            res.body.countryToCount.length.should.be.equal(2);
            res.body.monthlyActive.should.be.equal(2);
            res.body.iCloudDocker.total.should.be.equal(1);
            res.body.haBouncie.total.should.be.equal(1);
        });
        it('should return error in case of internal failure', async () => {
            Sinon.stub(Installation, 'count').throws({ errors: [{ message: 'Exception occcurred.' }] });
            const res = await chai.request(server).get(ENDPOINT);
            res.status.should.be.equal(500);
        });
    });
    it('POST should return error', async () => {
        const res = await chai.request(server).post(ENDPOINT).send({ valid: 'data' });
        res.status.should.be.equal(404);
    });
    it('PUT should return error', async () => {
        const res = await chai.request(server).put(ENDPOINT).send({ valid: 'data' });
        res.status.should.be.equal(404);
    });
    it('DELETE should return error', async () => {
        const res = await chai.request(server).delete(ENDPOINT).send({ valid: 'data' });
        res.status.should.be.equal(404);
    });
});
