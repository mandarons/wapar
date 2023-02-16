// import { Optional, Model } from 'sequelize';
export interface IHeartbeatRecordAttributes {
    id?: string;
    installationId: string;
    data?: object | null;
    createdAt?: Date;
    updatedAt?: Date;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
// export interface IHeartbeatRecordCreationAttributes extends Optional<IHeartbeatRecordAttributes, 'installationId'> {}
// export interface IHeartbeatRecordInstance extends Model<IHeartbeatRecordAttributes, IHeartbeatRecordCreationAttributes>, IHeartbeatRecordAttributes {
//     createdAt?: Date;
//     updatedAt?: Date;
// }
