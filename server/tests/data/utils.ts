import { faker } from '@faker-js/faker';
import { IInstallationRecordAttributes } from '../../src/db/installations/installations.schema';
import { IDemographicRecordAttributes } from '../../src/db/demographics/demographic.schema';

const createDemographicsRecord = (onlyRequired: boolean = false): IDemographicRecordAttributes => {
    const record: IDemographicRecordAttributes = { installation_id: faker.datatype.uuid(), ip_address: faker.internet.ipv4() };
    if (!onlyRequired) {
        record.country_code = faker.address.countryCode();
        record.region = faker.address.stateAbbr();
        record.city = faker.address.cityName();
    }
    return record;
};
const randomAppName = () => faker.helpers.arrayElement(['icloud-drive-docker', 'ha-bouncie']);
const randomAppVersion = () => `${faker.random.numeric()}.${faker.random.numeric()}.${faker.random.numeric()}`;
const createInstallationRecord = (): IInstallationRecordAttributes => {
    return {
        app_name: randomAppName(),
        app_version: randomAppVersion()

    };
};

export default {
    randomAppName,
    randomAppVersion,
    createDemographicsRecord,
    createInstallationRecord,
};