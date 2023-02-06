import { Model, Optional } from 'sequelize';

export interface IInstallationRecordAttributes {
  id?: string;
  appName: string;
  appVersion: string;
  ipAddress: string;
  previousId?: string | null;
  data?: object | null;
  countryCode?: string | null;
  region?: string | null;
  city?: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IInstallationRecordCreationAttributes
  extends Optional<IInstallationRecordAttributes, 'id'> {}
export interface IInstallationRecordInstance
  extends Model<
      IInstallationRecordAttributes,
      IInstallationRecordCreationAttributes
    >,
    IInstallationRecordAttributes {
  createdAt: Date;
  updatedAt: Date;
}
