import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import db from '../sql.connection';

export interface IDemographicRecordAttributes {
    id?: string;
    installation_id: string;
    ip_address: string;
    country_code?: string | null;
    region?: string | null;
    city?: string | null;
};
interface IDemographicRecordCreationAttributes extends Optional<IDemographicRecordAttributes, 'id'> { };
export interface IDemographicRecordInstance extends Model<IDemographicRecordAttributes, IDemographicRecordCreationAttributes>, IDemographicRecordAttributes {
    createdAt?: Date;
    updatedAt?: Date;
};

const Demographics = db.define<IDemographicRecordInstance>('demographics', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
    },
    installation_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    ip_address: {
        type: DataTypes.STRING,
        allowNull: false
    },
    country_code: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    region: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    city: {
        type: DataTypes.STRING,
        defaultValue: null
    }
}, {
    hooks: {
        beforeCreate: (record, options) => {
            delete record.id;
        }
    },
    timestamps: true,
    paranoid: true,
    freezeTableName: true,
    underscored: true,
    comment: 'Demographic record of apps'
});
/* istanbul ignore if */
if (process.env.NODE_ENV !== 'test') {
    Demographics.sync();
}

export {
    Demographics
};