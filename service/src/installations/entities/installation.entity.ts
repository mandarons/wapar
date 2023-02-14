import { ApiProperty } from '@nestjs/swagger';
import { installation } from '@prisma/client';

export class InstallationEntity implements installation {
  @ApiProperty()
  id: string;
  @ApiProperty()
  appName: string;
  @ApiProperty()
  appVersion: string;
  @ApiProperty()
  ipAddress: string;
  @ApiProperty()
  previousId: string | null;
  @ApiProperty()
  countryCode: string | null;
  @ApiProperty()
  region: string | null;
  @ApiProperty()
  city: string | null;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
}
