import { Injectable } from '@nestjs/common';
import { InstallationsService } from '../installations/installation.service';
import { HttpService } from '@nestjs/axios';
import { Interval } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
const IP_API_ENDPOINT = 'http://ip-api.com/batch?fields=countryCode,region,query';

@Injectable()
export class TasksService {
    constructor(private readonly installationService: InstallationsService, private readonly httpService: HttpService) {}

    @Interval('updateIpInfo', 60 * 60000)
    async updateIpInfo() {
        // Get 100 missing data records
        const missingData = await this.installationService.getMissingIPInfo();
        if (missingData.length > 0) {
            // Get unique IP addresses
            const ipAddresses = [...new Set(missingData.filter((e) => e.ipAddress))].map((i) => i.ipAddress);
            // Get demographic info for IP addresses
            const response = await firstValueFrom(this.httpService.post(IP_API_ENDPOINT, ipAddresses));
            const ipInfo = await response.data;
            // Create map of ip address to demographic info
            const ipToInfo = new Map(ipInfo.map((i: { query: string; country: string; region: string }) => [i.query, { country: i.country, region: i.region }]));
            // Update missing records in table
            const patchData: { id: string; countryCode: string; region: string }[] = [];
            missingData.forEach((d) => {
                const ipInfo = ipToInfo.get(d.ipAddress) as { country: string; region: string };
                patchData.push({ id: d.id, countryCode: ipInfo.country, region: ipInfo.region });
            });
            await this.installationService.patchMissingIPInfo(patchData);
            return true;
        }
        return false;
    }
}
