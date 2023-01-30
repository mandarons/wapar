import { DataTypes, Model, Optional, Sequelize } from 'sequelize';
import db from '../sql.connection';

export interface IHeartbeatRecordAttributes {
    id?: string;
    installation_id: string;
}
interface IHeartbeatRecordCreationAttributes extends Optional<IHeartbeatRecordAttributes, 'installation_id'> { };
export interface IHeartbeatRecordInstance extends Model<IHeartbeatRecordAttributes, IHeartbeatRecordCreationAttributes>, IHeartbeatRecordAttributes {
    createdAt?: Date;
    updatedAt?: Date;
}

const Heartbeats = db.define<IHeartbeatRecordInstance>('heartbeats', {
    id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        unique: true,
        defaultValue: Sequelize.literal('uuid_generate_v4()')
    },
    installation_id: {
        type: DataTypes.UUID,
        allowNull: false
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
    Heartbeats.sync();
}

export {
    Heartbeats
};
