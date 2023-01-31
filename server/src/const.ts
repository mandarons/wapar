import path from 'path';
import yaml from 'js-yaml';
import fs from 'fs';


interface IConfig {
    server: {
        port: number;
        refreshDemographicsInterval: string;
        saveDataInterval: string;
        dataFilePath: string;
    };
    database: {
        host: string;
        port: number;
        name: string;
        username: string;
        password: string;
    };
}

const configFolderPath: string = path.resolve(path.join(__dirname, '..', 'config'));
const PROD_CONFIG_FILE_NAME = 'config.yaml';
const TEST_CONFIG_FILE_NAME = 'test-config.yaml';
const DEV_CONFIG_FILE_NAME = 'dev-config.yaml';


const configYamlMap: { [key: string]: string; } = {
    'production': path.resolve(path.join(configFolderPath, PROD_CONFIG_FILE_NAME)).toString(),
    'test': path.resolve(path.join(configFolderPath, TEST_CONFIG_FILE_NAME)).toString(),
    'development': path.resolve(path.join(configFolderPath, DEV_CONFIG_FILE_NAME)).toString()
};

const getConfigYamlPath = (): string => {
    /* istanbul ignore next */
    const currentEnv = process.env.NODE_ENV !== undefined ? process.env.NODE_ENV.toLowerCase() : 'development';
    return configYamlMap[currentEnv];
};

const appConfig: IConfig = yaml.load(fs.readFileSync(getConfigYamlPath(), 'utf-8')) as IConfig;
console.log('Loaded config file: ' + getConfigYamlPath());

const appsList = ['ha-bouncie', 'icloud-drive-docker'];
const ipInfoBatchSize = 100;
const ipInfoAPIURL = 'http://ip-api.com/batch?fields=country,region,city,query';


export default appConfig;
export {
    IConfig,
    getConfigYamlPath,
    appsList,
    ipInfoBatchSize,
    ipInfoAPIURL
};