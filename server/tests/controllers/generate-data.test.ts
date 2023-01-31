import chai from 'chai';
import Sinon from 'sinon';
import { DemographicModel } from '../../src/db/demographics/demographic.model';
import { addNewInstallation, InstallationModel } from '../../src/db/installations/installation.model';
import utils from '../data/utils';
import generateData from '../../src/controllers/generate-data';
import fs from 'fs';
import appConfig from '../../src/const';
chai.should();

describe('Generate data cron job', async () => {
    const installationRecord = utils.createInstallationRecord();
    beforeEach(async () => {
        await DemographicModel.sync({ force: true });
        await InstallationModel.sync({ force: true });
    });
    afterEach(async () => {
        fs.rmSync(appConfig.server.dataFilePath);
        await DemographicModel.drop();
        await InstallationModel.drop();
        Sinon.restore();
    });
    it('should save data to data.json', async () => {
        await addNewInstallation(installationRecord);
        const result = await generateData.job();
        result.should.be.true;
        const data = JSON.parse(fs.readFileSync(appConfig.server.dataFilePath).toString());
        data.should.have.property('totalInstallations');
        data.totalInstallations.should.be.equal(1);
    });
    it('should save data in case of installation count error', async () => {
        await addNewInstallation(installationRecord);
        Sinon.stub(InstallationModel, 'count').throws({ errors: [{ message: 'Exception occurred.' }] });
        let result = await generateData.job();
        result.should.be.true;
        fs.existsSync(appConfig.server.dataFilePath);
    });
    it('should save data in case of installation findAll error', async () => {
        await addNewInstallation(installationRecord);
        Sinon.stub(InstallationModel, 'findAll').throws({ errors: [{ message: 'Exception occurred.' }] });
        const result = await generateData.job();
        result.should.be.true;
        fs.existsSync(appConfig.server.dataFilePath);
    });
    it('should save data for 0 installations', async () => {
        const result = await generateData.job();
        result.should.be.true;
        const data = JSON.parse(fs.readFileSync(appConfig.server.dataFilePath).toString());
        data.should.have.property('totalInstallations');
        data.totalInstallations.should.be.equal(0);
    });
});