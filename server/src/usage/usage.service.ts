import { Injectable } from '@nestjs/common';
import { InstallationsService } from '../installations/installation.service';

@Injectable()
export class UsageService {
    constructor(private readonly installationService: InstallationsService) {}
    async getUsageData() {
        return {
            totalInstallations: await this.installationService.count(),
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
