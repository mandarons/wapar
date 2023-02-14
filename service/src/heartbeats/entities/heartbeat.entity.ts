import { ApiProperty } from '@nestjs/swagger';
import { heartbeat, Prisma } from '@prisma/client';

export class HeartbeatEntity implements heartbeat {
  @ApiProperty()
  id: string;
  @ApiProperty()
  installationId: string;
  @ApiProperty()
  data: Prisma.JsonValue;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;
}
