import { ApiProperty } from '@nestjs/swagger';

export class UsageSummaryEntity {
  @ApiProperty()
  totalInstallations: number | null;
  @ApiProperty()
  icloudDocker: {
    total: number | null;
  };
  @ApiProperty()
  haBouncie: {
    total: number | null;
  };
}
