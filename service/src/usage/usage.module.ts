import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { InstallationsModule } from '../installations/installations.module';
import { HeartbeatsModule } from '../heartbeats/heartbeats.module';

@Module({
  controllers: [UsageController],
  providers: [UsageService],
  imports: [InstallationsModule, HeartbeatsModule],
})
export class UsageModule {}
