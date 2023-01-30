import fs from 'fs';
import yaml from 'js-yaml';
import config, { getConfigYamlPath } from '../src/const';
import chai from 'chai';
chai.should();

describe('Config reader ', () => {
    let expectedConfig: object = {};

    before(() => {
        process.env.NODE_ENV = 'test';
        expectedConfig = yaml.load(fs.readFileSync(getConfigYamlPath()).toString()) as object;
    });

    beforeEach(() => {
        process.env.NODE_ENV = 'test';
    });

    it('should load config.yaml for production environment', async () => {
        process.env.NODE_ENV = 'production';
        getConfigYamlPath().should.contain('/config.yaml');
    });

    it('should load tests-config.yaml for tests environment', async () => {
        getConfigYamlPath().should.contain('/test-config.yaml');
    });

    it('should load dev-config.yaml for non-production, non-tests environment', async () => {
        delete process.env.NODE_ENV;
        getConfigYamlPath().should.contain('/dev-config.yaml');
    });

    it('should load configuration file', async () => {
        config.should.be.deep.equal(expectedConfig);
    });
});