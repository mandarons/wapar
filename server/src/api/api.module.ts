import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';

@Module({
    imports: [],
    providers: [],
    controllers: [ApiController],
})
export class ApiModule {}
