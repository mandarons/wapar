import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { HttpModule } from '@nestjs/axios';
import { InstallationsModule } from '../installations/installations.module';
@Module({
    providers: [TasksService],
    imports: [HttpModule, InstallationsModule],
})
export class TasksModule {}
