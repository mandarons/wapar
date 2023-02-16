import { literal } from 'sequelize';
import { Column, CreatedAt, DataType, Model, Table, UpdatedAt } from 'sequelize-typescript';
import { IHeartbeatRecordAttributes } from './heartbeat.interface';
@Table({
    timestamps: true,
    paranoid: true,
    freezeTableName: true,
    underscored: true,
    comment: 'Heartbeats of existing installations',
})
export class Heartbeat extends Model<IHeartbeatRecordAttributes> {
    @Column({
        type: DataType.UUID,
        primaryKey: true,
        allowNull: false,
        unique: true,
        defaultValue: literal('uuid_generate_v4()'),
    })
    id: string;
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    installationId: string;
    @Column({
        type: DataType.JSONB,
        defaultValue: null,
    })
    data: object;

    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}
