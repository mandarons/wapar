import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class PostInstallationDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    appName: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(5)
    appVersion: string;

    @IsOptional()
    @IsString()
    @MinLength(10)
    previousId?: string;
}
