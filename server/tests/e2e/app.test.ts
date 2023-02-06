import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import chai from 'chai';
import chaiHTTP from 'chai-http';
import { AppModule } from '../../src/app.module';

chai.should();
chai.use(chaiHTTP);

describe('AppController (e2e)', async () => {
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

  it('/ (GET)', async () => {
    const res = await chai.request(server).get('/');
    res.status.should.be.equal(200);
    res.text.should.be.equal('Hello World!');
  });
});