import { Controller, Post, Body, Ip } from '@nestjs/common';
import { InstallationsService } from './installations.service';
import { CreateInstallationDto } from './dto/create-installation.dto';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { InstallationEntity } from './entities/installation.entity';

@Controller('installations')
@ApiTags('installations')
export class InstallationsController {
  constructor(private readonly installationsService: InstallationsService) {}

  @Post()
  @ApiCreatedResponse({ type: InstallationEntity })
  create(@Body() createInstallationDto: CreateInstallationDto, @Ip() ipAddress: string) {
    createInstallationDto.ipAddress = ipAddress;
    return this.installationsService.create(createInstallationDto);
  }
}
