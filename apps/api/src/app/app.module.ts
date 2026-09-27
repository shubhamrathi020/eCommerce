import { type DynamicModule, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccountsController, AccountsService } from './accounts/accounts';
import { AddressesController, AddressesService } from './addresses/addresses';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { MailService } from './auth/mail.service';
import { PasswordService } from './auth/password.service';
import { TokenService } from './auth/tokens';
import { ApiErrorFilter } from './common/api-error.filter';
import { AuthGuard, CsrfGuard } from './common/auth';
import { RequestContextMiddleware } from './common/request-context.middleware';
import { API_CONFIG, type ApiConfig } from './config';
import { DevOutboxController, HealthController } from './health/health';
import { PrismaService } from './prisma/prisma.service';

/**
 * Modular monolith root (BF-01). Domains (auth, accounts, addresses, and later catalog, commerce ...) are
 * separate folders that talk through services, so any of them can be extracted into its own service later.
 */
@Module({})
export class AppModule implements NestModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        // Global default for every route; auth endpoints set a stricter limit of their own (BF-09).
        ThrottlerModule.forRoot({ throttlers: [{ name: 'default', ttl: 60_000, limit: 300 }], skipIf: () => !config.rateLimit }),
      ],
      controllers: [HealthController, DevOutboxController, AuthController, AccountsController, AddressesController],
      providers: [
        { provide: API_CONFIG, useValue: config },
        { provide: APP_FILTER, useClass: ApiErrorFilter },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        PrismaService,
        PasswordService,
        TokenService,
        MailService,
        AuthService,
        AccountsService,
        AddressesService,
        AuthGuard,
        CsrfGuard,
      ],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('{*splat}');
  }
}
