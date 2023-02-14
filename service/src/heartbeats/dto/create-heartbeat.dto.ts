import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateHeartbeatDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  installationId: string;

  @ApiProperty({ required: false })
  data?: object;
}
