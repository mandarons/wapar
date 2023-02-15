import { readFileSync } from 'fs';
import jsYAML from 'js-yaml';
import { join } from 'path';

const YAML_CONFIG_FILENAME = 'config.yaml';

export interface IConfig {
    server: {
        port: number;
        refreshDemographicsInterval: string;
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

export const configFilePath = join(__dirname, YAML_CONFIG_FILENAME);

export default () => {
    return jsYAML.load(readFileSync(configFilePath, 'utf-8')) as Record<string, any>;
};
