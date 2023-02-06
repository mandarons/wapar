import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import chai from 'chai';
import chaiHttp from 'chai-http';
import { Heartbeat } from '../../src/heartbeats/heartbeat.model';
import { AppModule } from '../../src/app.module';
import dataUtils from '../data.utils';
import { Installation } from '../../src/installations/installation.model';
chai.should();
chai.use(chaiHttp);

describe('/api/heartbeat', async () => {
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
    await Heartbeat.sync({ force: true });
  });
  afterEach(async () => {
    await Installation.drop();
    await Heartbeat.drop();
  });
  it('POST', async () => {
    const record = await Installation.create(
      dataUtils.createInstallationRecord(dataUtils.appsList[0]),
    );
    const res = await chai
      .request(server)
      .post('/api/heartbeat')
      .send(dataUtils.createHeartbeatRecord(record.id));
    res.status.should.be.equal(201);
    res.body.message.should.be.equal('All good.');
  });
});
