import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InstallationsModule } from './installations/installations.module';
import configuration from './config/configuration';
import { PrismaModule } from 'nestjs-prisma';
import { HeartbeatsModule } from './heartbeats/heartbeats.module';
import { UsageModule } from './usage/usage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule.forRootAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService) => {
        return {
          prismaOptions: {
            datasources: {
              db: {
                url: `postgres://${configService.get<string>('database.username')}:${configService.get<string>('database.password')}@${configService.get<string>(
                  'database.host',
                )}:${configService.get<string>('database.port')}/${configService.get<string>('database.name')}?schema=public`,
              },
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    InstallationsModule,
    HeartbeatsModule,
    UsageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
