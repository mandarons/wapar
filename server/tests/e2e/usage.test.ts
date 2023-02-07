import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { Installation } from '../../src/installations/installation.model';
import { AppModule } from '../../src/app.module';
import utils from '../data.utils';
import { IInstallationRecordAttributes } from 'src/installations/installation.interface';
chai.should();
chai.use(chaiHttp);

describe('/api/usage', async () => {
    let app: INestApplication;
    let server: any;
    before(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        server = app.getHttpServer();
    });
    describe('GET', async () => {
        beforeEach(async () => {
            await Installation.sync({ force: true });
        });
        afterEach(async () => {
            await Installation.drop();
        });
        it('should return empty data', async () => {
            const res = await chai.request(server).get('/api/usage');
            res.status.should.be.equal(200);
            res.body.totalInstallations.should.be.equal(0);
            res.body.iCloudDocker.total.should.be.equal(0);
            res.body.haBouncie.total.should.be.equal(0);
        });
        it('should return non-empty data', async () => {
            await Installation.create(utils.createInstallationRecord(utils.appsList[0]));
            await Installation.create(utils.createInstallationRecord(utils.appsList[1]));
            const res = await chai.request(server).get('/api/usage');
            res.status.should.be.equal(200);
            res.body.totalInstallations.should.be.equal(2);
            res.body.iCloudDocker.total.should.be.equal(1);
            res.body.haBouncie.total.should.be.equal(1);
        });
    });
});
