import { Injectable } from '@nestjs/common';
import { InstallationsService } from '../../src/installations/installation.service';

@Injectable()
export class UsageService {
  constructor(private readonly installationService: InstallationsService) {}
  private async getTotalAppInstallations(appName: string) {
    const result = await this.installationService.findByAppName(appName);
    if (result.success === false) {
      return null;
    }
    return result.values as number;
  }
  private async getTotalInstallations() {
    const result = await this.installationService.count();
    if (result.success === false) {
      return null;
    }
    return result.values as number;
  }
  async getUsageData() {
    return {
      totalInstallations: await this.getTotalInstallations(),
      createdAt: new Date().toUTCString(),
      iCloudDocker: {
        total: await this.getTotalAppInstallations('icloud-drive-docker'),
      },
      haBouncie: {
        total: await this.getTotalAppInstallations('ha-bouncie'),
      },
    };
  }
}
