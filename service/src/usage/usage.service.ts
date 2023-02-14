import { Injectable } from '@nestjs/common';
import { HeartbeatsService } from '../heartbeats/heartbeats.service';
import { InstallationsService } from '../installations/installations.service';

@Injectable()
export class UsageService {
  constructor(private readonly installationService: InstallationsService, private readonly heartbeatService: HeartbeatsService) {}
  async getUsageSummary() {
    const totalInstallations = await this.installationService.count();
    const totalICloudDocker = await this.installationService.countByApp('icloud-drive-docker');
    const totalHaBouncie = await this.installationService.countByApp('ha-bouncie');
    return {
      totalInstallations,
      createdAt: new Date().toUTCString(),
      iCloudDocker: {
        total: totalICloudDocker,
      },
      haBouncie: {
        total: totalHaBouncie,
      },
    };
  }
}
