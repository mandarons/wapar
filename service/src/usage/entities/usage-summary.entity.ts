import { ApiProperty } from '@nestjs/swagger';

export class UsageSummaryEntity {
  @ApiProperty()
  totalInstallations: number | null;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  icloudDocker: {
    total: number | null;
  };
  @ApiProperty()
  haBouncie: {
    total: number | null;
  };
}
