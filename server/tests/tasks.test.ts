import { faker } from '@faker-js/faker';
import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import chai from 'chai';
import Sinon from 'sinon';
import { InstallationsModule } from '../src/installations/installations.module';
import { Installation } from '../src/installations/installation.model';
import { InstallationsService } from '../src/installations/installation.service';
import { TasksService } from '../src/tasks/tasks.service';
import dataUtils from './data.utils';
chai.should();

describe('Tasks', async () => {
  let service: TasksService;
  before(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, InstallationsService],
      imports: [HttpModule, InstallationsModule],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });
  afterEach(async () => await dataUtils.syncDb(false));
  it('Should populate IP info for < 100 IP addresses', async () => {
    const mock = Sinon.stub(axios, 'post');
    mock.callsFake((url, data) => {
      return new Promise((resolve) => resolve({ data: (data as string[]).map((e: string) => ({ query: e, country: faker.address.country(), region: faker.address.state() })) }));
    });
    const installationRecords = new Array(80);
    for (let i = 0; i < installationRecords.length; ++i) installationRecords[i] = dataUtils.createInstallationRecord();

    await Installation.bulkCreate( installationRecords);
    const result = await service.updateIpInfo();
    result.should.be.true;
  });
});
