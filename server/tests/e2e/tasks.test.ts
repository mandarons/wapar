import { faker } from '@faker-js/faker';
import { HttpModule } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import chai from 'chai';
import Sinon from 'sinon';
import { InstallationsModule } from '../../src/installations/installations.module';
import { Installation } from '../../src/installations/installation.model';
import { TasksService } from '../../src/tasks/tasks.service';
import dataUtils from '../data.utils';
import { DbModule } from '../../src/db/db.module';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../src/config/configuration';
import { InstallationsService } from '../../src/installations/installation.service';
chai.should();

describe('Tasks', async () => {
    let service: TasksService;
    let installationService: InstallationsService;
    before(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TasksService],
            imports: [
                HttpModule,
                InstallationsModule,
                DbModule,
                ConfigModule.forRoot({
                    isGlobal: true,
                    load: [configuration],
                }),
            ],
        }).compile();
        service = module.get<TasksService>(TasksService);
        installationService = module.get<InstallationsService>(InstallationsService);
    });
    beforeEach(async () => await dataUtils.syncDb(true));
    afterEach(async () => {
        Sinon.restore();
        await dataUtils.syncDb(false);
    });
    it('Should populate IP info for < 100 IP addresses', async () => {
        const mock = Sinon.stub(axios, 'post');
        mock.callsFake((url, data) => {
            return new Promise((resolve) =>
                resolve({ data: (data as string[]).map((e: string) => ({ query: e, country: faker.address.country(), region: faker.address.state() })) }),
            );
        });
        const installationRecords = new Array(80);
        for (let i = 0; i < installationRecords.length; ++i) installationRecords[i] = dataUtils.createInstallationRecord();

        await Installation.bulkCreate(installationRecords);
        const result = await service.updateIpInfo();
        result.should.be.true;
        (await installationService.getMissingIPInfo()).length.should.be.equal(0);
    });
    it('Should populate IP info in chunks of 100', async () => {
        const mock = Sinon.stub(axios, 'post');
        mock.callsFake((url, data) => {
            return new Promise((resolve) =>
                resolve({ data: (data as string[]).map((e: string) => ({ query: e, country: faker.address.country(), region: faker.address.state() })) }),
            );
        });
        const installationRecords = new Array(110);
        for (let i = 0; i < installationRecords.length; ++i) installationRecords[i] = dataUtils.createInstallationRecord();

        await Installation.bulkCreate(installationRecords);
        let result = await service.updateIpInfo();
        result.should.be.true;
        (await installationService.getMissingIPInfo()).length.should.be.equal(10);
        result = await service.updateIpInfo();
        result.should.be.true;
        (await installationService.getMissingIPInfo()).length.should.be.equal(0);
    });
    it('Should return false if nothing to do', async () => {
        const result = await service.updateIpInfo();
        result.should.be.false;
        (await installationService.getMissingIPInfo()).length.should.be.equal(0);
    });
});
