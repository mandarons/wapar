import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InstallationController } from './installation.controller';
import { Installation } from './installation.model';
import { InstallationsService } from './installation.service';

@Module({
  imports: [SequelizeModule.forFeature([Installation])],
  providers: [InstallationsService],
  controllers: [InstallationController],
  exports: [InstallationsService],
})
export class InstallationsModule {}
