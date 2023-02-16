import chai from 'chai';
import chaiHttp from 'chai-http';
import { Installation } from '../../src/installations/installation.model';
import utils from '../data.utils';
import Sinon from 'sinon';
import dataUtils from '../data.utils';

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
            res.body.totalInstallations.should.be.equal(0);
            res.body.iCloudDocker.total.should.be.equal(0);
            res.body.haBouncie.total.should.be.equal(0);
        });
        it('should return non-empty data', async () => {
            await Installation.create(utils.createInstallationRecord(utils.appsList[0]));
            await Installation.create(utils.createInstallationRecord(utils.appsList[1]));
            const res = await chai.request(server).get(ENDPOINT);
            res.status.should.be.equal(200);
            res.body.totalInstallations.should.be.equal(2);
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
