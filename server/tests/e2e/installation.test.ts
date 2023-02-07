import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { AppModule } from '../../src/app.module';
import dataUtils from '../data.utils';
chai.should();
chai.use(chaiHttp);

describe('/api/installation', async () => {
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
    beforeEach(async () => {
        await dataUtils.syncDb();
    });
    afterEach(async () => {
        await dataUtils.syncDb(false);
    });
    it('POST with valid data should succeed', async () => {
        const res = await chai.request(server).post('/api/installation').send(dataUtils.createInstallationRecord());
        res.status.should.be.equal(201);
        res.body.should.have.property('id');
        res.body.id.should.not.be.empty;
    });
    it('POST should fail for invalid data', async () => {
        const res = await chai.request(server).post('/api/installation').send({ invalid: 'data' });
        res.status.should.be.equal(422);
    });
    it('GET should return error', async () => {
        const res = await chai.request(server).get('/api/installation');
        res.status.should.be.equal(404);
    });
    it('PUT should return error', async () => {
        const res = await chai.request(server).put('/api/installation').send(dataUtils.createInstallationRecord());
        res.status.should.be.equal(404);
    });
    it('DELETE should return error', async () => {
        const res = await chai.request(server).get('/api/installation').send(dataUtils.createInstallationRecord());
        res.status.should.be.equal(404);
    });
});
