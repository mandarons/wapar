import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { Installation } from '../../src/installations/installation.model';
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
    await Installation.sync({ force: true });
  });
  afterEach(async () => {
    await Installation.drop();
  });
  it('POST', async () => {
    const res = await chai
      .request(server)
      .post('/api/installation')
      .send(dataUtils.createInstallationRecord());
    res.status.should.be.equal(201);
    res.body.should.have.property('id');
    res.body.id.should.not.be.empty;
  });
});
