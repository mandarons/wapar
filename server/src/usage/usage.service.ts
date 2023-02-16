import { Injectable } from '@nestjs/common';
import { HeartbeatService } from '../heartbeats/heartbeat.service';
import { InstallationsService } from '../installations/installation.service';

@Injectable()
export class UsageService {
    constructor(private readonly installationService: InstallationsService, private readonly heartbeatService: HeartbeatService) {}
    async getUsageData() {
        return {
            totalInstallations: await this.installationService.count(),
            monthlyActive: await this.heartbeatService.getMonthlyActive(),
            createdAt: new Date().toUTCString(),
            iCloudDocker: {
                total: await this.installationService.findByAppName('icloud-drive-docker'),
            },
            haBouncie: {
                total: await this.installationService.findByAppName('ha-bouncie'),
            },
        };
    }
}
