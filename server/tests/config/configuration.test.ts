import fs from 'fs';
import yaml from 'js-yaml';
import loadConfig, {
  IConfig,
  configFilePath,
} from '../../src/config/configuration';
import chai from 'chai';
chai.should();

describe('Config reader', async () => {
  const expectedConfig: IConfig = yaml.load(
    fs.readFileSync(configFilePath, 'utf-8').toString(),
  ) as IConfig;
  it('should load config.yaml', async () => {
    const config = loadConfig();
    config.should.be.deep.equal(expectedConfig);
  });
});
