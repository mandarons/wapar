import server from '../../src/';
import utils from '../data/utils';
import { DemographicModel } from '../../src/db/demographics/demographic.model';
import { InstallationModel } from '../../src/db/installations/installation.model';
import chai from 'chai';
import chaiHTTP from 'chai-http';
import { faker } from '@faker-js/faker';
import Sinon from 'sinon';
import { Installations } from '../../src/db/installations/installations.schema';
import { Heartbeats } from '../../src/db/heartbeats/heartbeat.schema';
import { Demographics } from '../../src/db/demographics/demographic.schema';
import { appsList } from '../../src/const';
chai.should();
chai.use(chaiHTTP);
describe('/api', async () => {
    describe('/installation', async () => {
        describe('/new', async () => {
            before(async () => {
                await DemographicModel.sync({ force: true });
                await InstallationModel.sync({ force: true });
            });
            afterEach(async () => Sinon.restore());
            after(async () => {
                await DemographicModel.drop();
                await InstallationModel.drop();
            });
            it('should create a new deployment entry and return ID', async () => {
                const res = await chai.request(server.app)
                    .post('/api/installation/new')
                    .send({
                        app_name: utils.randomAppName(),
                        app_version: utils.randomAppVersion()
                    });
                res.status.should.be.equal(200);
                res.body.status.should.be.equal('success');
                res.body.data.id.should.not.be.empty;
            });
            it('should create a new deployment entry with previous installation id', async () => {
                const res = await chai.request(server.app)
                    .post('/api/installation/new')
                    .send({
                        app_name: utils.randomAppName(),
                        app_version: utils.randomAppVersion(),
                        previous_installation_id: faker.datatype.uuid()
                    });
                res.status.should.be.equal(200);
                res.body.status.should.be.equal('success');
            });
            it('should not create a new record if data is missing', async () => {
                const res = await chai.request(server.app)
                    .post('/api/installation/new')
                    .send({
                        app_name: utils.randomAppName(),
                    });
                res.status.should.be.equal(500);
                res.body.status.should.be.equal('error');
            });
            it('should return error in case of internal failure', async () => {
                Sinon.stub(Installations, 'create').throws({ errors: [{ message: 'Exception occurred.' }] });
                let res = await chai.request(server.app)
                    .post('/api/installation/new')
                    .send({
                        app_name: utils.randomAppName(),
                        app_version: utils.randomAppVersion(),
                        previous_installation_id: faker.datatype.uuid()
                    });
                res.status.should.be.equal(500);
                res.body.status.should.be.equal('error');
                Sinon.restore();
                Sinon.stub(Demographics, 'create').throws({ errors: [{ message: 'Exception occurred.' }] });
                res = await chai.request(server.app)
                    .post('/api/installation/new')
                    .send({
                        app_name: utils.randomAppName(),
                        app_version: utils.randomAppVersion(),
                        previous_installation_id: faker.datatype.uuid()
                    });
                res.status.should.be.equal(500);
                res.body.status.should.be.equal('error');
            });
        });
    });
    describe('/heartbeat', async () => {
        describe('/new', async () => {
            before(async () => {
                await DemographicModel.sync({ force: true });
                await InstallationModel.sync({ force: true });
            });
            afterEach(async () => Sinon.restore());
            after(async () => {
                await DemographicModel.drop();
                await InstallationModel.drop();
            });
            it('should record a new heartbeat', async () => {
                // await chai.request(server.app)
                //     .post('/api/heartbeat/new')
                //     .send({
                //         installation_id: faker.datatype.uuid(),
                //         app_name: utils.randomAppName(),
                //         app_version: utils.randomAppVersion()
                //     });
                // res.status.should.be.equal(200);
                // res.body.status.should.be.equal('success');
            }).timeout(5000);
            it('should not record a heartbeat if data is missing', async () => {
                const res = await chai.request(server.app)
                    .post('/api/heartbeat/new')
                    .send({
                        app_name: utils.randomAppName(),
                    });
                res.status.should.be.equal(500);
                res.body.status.should.be.equal('error');
            });
            it('should return error in case of internal failure', async () => {
                Sinon.stub(Heartbeats, 'create').throws({ errors: [{ message: 'Exception occurred.' }] });
                const res = await chai.request(server.app)
                    .post('/api/heartbeat/new')
                    .send({
                        app_name: utils.randomAppName(),
                        app_version: utils.randomAppVersion(),
                        installation_id: faker.datatype.uuid()
                    });
                res.status.should.be.equal(500);
                res.body.status.should.be.equal('error');
            });
        });
    });
    describe('/data', async () => {
        describe('/', async () => {
            before(async () => {
                await DemographicModel.sync({ force: true });
                await InstallationModel.sync({ force: true });
            });
            afterEach(async () => Sinon.restore());
            after(async () => {
                await DemographicModel.drop();
                await InstallationModel.drop();
                console.error('After done.');
            });
            it('should return the aggregate data', async () => {
                for await (const appName of appsList) {
                    let res = await chai.request(server.app)
                        .post('/api/installation/new')
                        .send({
                            app_name: appName,
                            app_version: utils.randomAppVersion(),
                        });
                    res.status.should.be.equal(200);
                    res.body.status.should.be.equal('success');
                };
                const res = await chai.request(server.app)
                    .get('/api/data/');
                res.status.should.be.equal(200);
                res.body.status.should.be.equal('success');
                res.body.data.totalInstallations.should.be.equal(2);
            });
            it('should return null in case of internal failure', async () => {
                // for await (const appName of appsList) {
                //     let res = await chai.request(server.app)
                //         .post('/api/heartbeat/new')
                //         .send({
                //             app_name: appName,
                //             app_version: utils.randomAppVersion(),
                //             installation_id: faker.datatype.uuid()
                //         });
                //     res.status.should.be.equal(200);
                //     res.body.status.should.be.equal('success');
                // };
                // Sinon.stub(Installations, 'count').throws({ errors: [{ message: 'Exception occurred.' }] });
                // let res = await chai.request(server.app)
                //     .get('/api/data/');
                // res.status.should.be.equal(200);
                // res.body.status.should.be.equal('success');
                // chai.expect(res.body.data.totalInstallations).to.be.null;
                // Sinon.restore();

                // Sinon.stub(Installations, 'findAll').throws({ errors: [{ message: 'Exception occurred.' }] });
                // res = await chai.request(server.app)
                //     .get('/api/data/');
                // res.status.should.be.equal(200);
                // res.body.status.should.be.equal('success');
                // res.body.data.totalInstallations.should.be.equal(2);
                // chai.expect(res.body.data.iCloudDocker.total).to.be.null;

            }).timeout(5000);
        });
    });
});