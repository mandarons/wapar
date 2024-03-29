import { literal } from 'sequelize';
import { Column, Table, Model, DataType, CreatedAt, UpdatedAt } from 'sequelize-typescript';
import { IInstallationRecordAttributes } from './installation.interface';

@Table({
    timestamps: true,
    paranoid: true,
    freezeTableName: true,
    underscored: true,
    comment: 'Installation record of apps',
})
export class Installation extends Model<IInstallationRecordAttributes> {
    @Column({
        type: DataType.UUID,
        primaryKey: true,
        allowNull: false,
        unique: true,
        defaultValue: literal('uuid_generate_v4()'),
    })
    id: string;
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    appName: string;
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    appVersion: string;
    @Column({
        type: DataType.INET,
        allowNull: false,
    })
    ipAddress: string;
    @Column({
        type: DataType.UUID,
        defaultValue: null,
    })
    previousId: string;
    @Column({
        type: DataType.JSONB,
        defaultValue: null,
    })
    data: object;
    @Column({
        type: DataType.STRING,
        defaultValue: null,
    })
    countryCode: string;
    @Column({
        type: DataType.STRING,
        defaultValue: null,
    })
    region: string;

    @CreatedAt
    @Column
    createdAt!: Date;

    @UpdatedAt
    @Column
    updatedAt!: Date;
}
