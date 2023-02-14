import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateInstallationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @MinLength(3)
  @ApiProperty()
  appName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  @MinLength(3)
  @ApiProperty()
  appVersion: string;

  @ApiProperty({ required: false })
  previousId?: string;

  ipAddress: string;
}
