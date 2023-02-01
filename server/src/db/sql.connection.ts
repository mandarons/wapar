import { Sequelize } from 'sequelize';
import config from '../const';

export interface IDatabaseResponse {
    values?: object | null | number;
    success: boolean;
    errorMessage?: string;
    data?: object;
};

const sequelize = new Sequelize(config.database.name, config.database.username, config.database.password, {
    dialect: 'postgres',
    logging: false,
    host: config.database.host,
    port: config.database.port
});

export default sequelize;