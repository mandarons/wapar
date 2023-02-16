import { IsNotEmpty, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class PostHeartbeatDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    installationId: string;

    @IsOptional()
    @IsObject()
    data?: object;
}
