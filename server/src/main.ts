/* istanbul ignore file */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestFastifyApplication, FastifyAdapter } from '@nestjs/platform-fastify';
import { Installation } from './installations/installation.model';
import { Heartbeat } from './heartbeats/heartbeat.model';
async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({
            ignoreDuplicateSlashes: true,
            ignoreTrailingSlash: true,
            trustProxy: true,
        }),
    );
    Installation.sync();
    Heartbeat.sync();
    await app.listen(3000, '0.0.0.0');
}

bootstrap();
