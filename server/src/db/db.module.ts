import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SequelizeModule, SequelizeModuleOptions } from '@nestjs/sequelize';
import { Heartbeat } from '../heartbeats/heartbeat.model';
import { Installation } from '../installations/installation.model';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          dialect: 'postgres',
          host: configService.get<string>('database.host'),
          port: configService.get<string>('database.port'),
          database: configService.get<string>('database.name'),
          username: configService.get<string>('database.username'),
          password: configService.get<string>('database.password'),
          models: [Installation, Heartbeat],
          logging: false,
        } as SequelizeModuleOptions;
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [],
})
export class DbModule {}
