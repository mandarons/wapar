import axios from 'axios';
import Sinon from 'sinon';
import { addNewDemographicsInfo, DemographicModel } from '../../src/db/demographics/demographic.model';
import utils from '../data/utils';
import updateDemographics from '../../src/controllers/update-demographics';
import { faker } from '@faker-js/faker';
import chai from 'chai';
import { InstallationModel } from '../../src/db/installations/installation.model';

chai.should();
describe('Update demographics cron job', async () => {
    const demographicRecord = utils.createDemographicsRecord(true);
    beforeEach(async () => {
        await DemographicModel.sync({ force: true });
        await InstallationModel.sync({ force: true });
        await addNewDemographicsInfo(demographicRecord);
    });
    afterEach(async () => {
        await DemographicModel.drop();
        await InstallationModel.drop();
        Sinon.restore();
    });
    it('should get demographics information for list of IPs', async () => {
        Sinon.stub(axios, 'post').returns(new Promise(r => r({
            status: 200,
            data: {
                country: faker.address.countryCode(),
                region: faker.address.stateAbbr(),
                city: faker.address.cityName(),
                query: demographicRecord.ip_address
            }
        })));
        const result = await updateDemographics.job();
        result.should.be.true;
        const updatedRecord = await DemographicModel.findOne({ where: { ip_address: demographicRecord.ip_address } });
        chai.expect(updatedRecord!.country_code).not.to.be.null;
        chai.expect(updatedRecord!.region).not.to.be.null;
        chai.expect(updatedRecord!.city).not.to.be.null;
    });
    it('should log error if IP info API fails', async () => {
        Sinon.stub(axios, 'post').returns(new Promise(r => r({ status: 500 })));
        const consoleSpy = Sinon.spy(console, 'error');
        const result = await updateDemographics.job();
        result.should.be.true;
        consoleSpy.calledWith(`Failed to get IP info for a batch. Continuing with the next batch ...`).should.be.true;
    });
    it('should return false if getMissingRecords db query fails', async () => {
        Sinon.stub(DemographicModel, 'findAll').throws({ errors: [{ message: 'Exception occurred.' }] });
        const consoleSpy = Sinon.spy(console, 'error');
        const result = await updateDemographics.job();
        result.should.be.false;
        consoleSpy.calledWithMatch(`Failed to get missing demographics -`).should.be.true;
    });
    it('should log error if updateDemographicsInfoByIp db query fails', async () => {
        Sinon.stub(DemographicModel, 'update').throws({ errors: [{ message: 'Exception occurred.' }] });
        const consoleSpy = Sinon.spy(console, 'error');
        const result = await updateDemographics.job();
        result.should.be.true;
        consoleSpy.calledWithMatch(`Failed to update demographics for`).should.be.true;
    });
});
