import { Controller, Get } from '@nestjs/common';

@Controller()
export class ApiController {
    @Get('api')
    get() {
        return 'All good.';
    }
}
