import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { HttpModule} from '@nestjs/axios';
@Module({
  providers: [TasksService],
  imports: [HttpModule]
})
export class TasksModule {}
