import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { HttpModule} from '@nestjs/axios';
import { InstallationsService } from '../installations/installation.service';
@Module({
  providers: [TasksService, InstallationsService],
  imports: [HttpModule]
})
export class TasksModule {}
