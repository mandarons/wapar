import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiModule } from './api/api.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DbModule } from './db/db.module';
import { HeartbeatsModule } from './heartbeats/heartbeats.module';
import { InstallationsModule } from './installations/installations.module';
import { UsageModule } from './usage/usage.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
        AppModule,
        ApiModule,
        InstallationsModule,
        HeartbeatsModule,
        UsageModule,
        DbModule,
        TasksModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
