import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IDatabaseResponse } from '../db/db.interface';
import { IHeartbeatRecordAttributes } from './heartbeat.interface';
import { Heartbeat } from './heartbeat.model';

@Injectable()
export class HeartbeatService {
  constructor(
    @InjectModel(Heartbeat) private readonly heartbeatModel: typeof Heartbeat,
  ) {}
  async create(data: IHeartbeatRecordAttributes): Promise<IDatabaseResponse> {
    let returnValue: IDatabaseResponse = { success: false };
    try {
      delete data.id;
      const createdEntry = await Heartbeat.create(data, { raw: false });
      returnValue.success = true;
      returnValue.values = createdEntry.toJSON();
    } catch (error: any) {
      returnValue = {
        success: false,
        errorMessage: error.errors[0].message,
        data: error,
      };
    }
    return returnValue;
  }
}
