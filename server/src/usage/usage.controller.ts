import { Controller, Get } from '@nestjs/common';
import { UsageService } from './usage.service';

@Controller('/api/usage')
export class UsageController {
    constructor(private readonly usageService: UsageService) {}
    @Get()
    async usageData(): Promise<object> {
        return await this.usageService.getUsageData();
    }
}
