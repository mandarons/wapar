import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import db from '../sql.connection';

export interface IInstallationRecordAttributes {
    id?: string;
    app_name: string;
    app_version: string;
    previous_id?: string;
    data?: object;
};
interface IInstallationRecordCreationAttributes extends Optional<IInstallationRecordAttributes, 'id'> { };
export interface IInstallationRecordInstance extends Model<IInstallationRecordAttributes, IInstallationRecordCreationAttributes>, IInstallationRecordAttributes {
    createdAt?: Date;
    updatedAt?: Date;
};

const Installations = db.define<IInstallationRecordInstance>('installations', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        unique: true,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
    },
    app_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    app_version: {
        type: DataTypes.STRING,
        allowNull: false
    },
    previous_id: {
        type: DataTypes.UUID,
        defaultValue: null
    },
    data: {
        type: DataTypes.JSON,
        defaultValue: null
    }
}, {
    timestamps: true,
    paranoid: true,
    freezeTableName: true,
    underscored: true,
    comment: 'Installation record of apps'
});
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
    Installations.sync();
}

export {
    Installations
};