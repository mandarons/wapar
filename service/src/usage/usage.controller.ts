import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsageService } from './usage.service';

@Controller('usage')
@ApiTags('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}
  @Get()
  async usageSummary() {
    return this.usageService.getUsageSummary();
  }
}
