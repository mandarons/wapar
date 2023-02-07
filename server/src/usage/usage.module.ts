import { Module } from '@nestjs/common';
import { InstallationsModule } from '../installations/installations.module';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
    providers: [UsageService],
    controllers: [UsageController],
    imports: [InstallationsModule],
})
export class UsageModule {}
