import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateInstallationDto } from './dto/create-installation.dto';

@Injectable()
export class InstallationsService {
  constructor(private readonly prisma: PrismaService) {}
  create(createInstallationDto: CreateInstallationDto) {
    return this.prisma.installation.create({ data: createInstallationDto });
  }

  count() {
    return this.prisma.installation.count();
  }
  countByApp(appName: string) {
    return this.prisma.installation.count({ where: { appName: appName } });
  }
}
