import { Body, Controller, Ip, Post } from '@nestjs/common';
import { InstallationsService } from './installation.service';
import { PostInstallationDto } from './post.dto';

@Controller('installation')
export class InstallationController {
    constructor(private readonly installationService: InstallationsService) {}
    @Post()
    async newInstallation(
        @Body()
        body: PostInstallationDto,
        @Ip() ipAddress: string,
    ): Promise<object> {
        const result = await this.installationService.create({
            ...body,
            ipAddress,
        });
        return { id: result.id };
    }
}
