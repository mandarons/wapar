import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import { InstallationsService } from './installation.service';
import { PostInstallationDto } from './post.dto';

@Controller('/api/installation')
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
    if (result.success === false) {
      throw new HttpException(
        'Failed to record.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return { id: (result.values as { id: string }).id };
  }
}
