import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import chai from 'chai';
import chaiHTTP from 'chai-http';
import { AppModule } from '../../src/app.module';

chai.should();
chai.use(chaiHTTP);

describe('/api', async () => {
    let app: INestApplication;
    let server: any;
    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        server = app.getHttpServer();
    });

    it('GET should return success', async () => {
        const res = await chai.request(server).get('/api');
        res.status.should.be.equal(200);
        res.text.should.be.equal('All good.');
    });
    it('POST should return error', async () => {
        const res = await chai.request(server).post('/api').send({ some: 'data' });
        res.status.should.be.equal(404);
    });
    it('PUT should return error', async () => {
        const res = await chai.request(server).put('/api').send({ some: 'data' });
        res.status.should.be.equal(404);
    });
    it('DELETE should return error', async () => {
        const res = await chai.request(server).delete('/api').send({ some: 'data' });
        res.status.should.be.equal(404);
    });
});
