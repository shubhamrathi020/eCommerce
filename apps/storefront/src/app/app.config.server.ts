import { ApplicationConfig, CSP_NONCE, REQUEST_CONTEXT, inject, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

/** Per-request context handed over by the Express server (see server.ts). */
interface RequestContext {
  nonce?: string;
}

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Lets Angular put the request's CSP nonce on the inline scripts and styles it renders.
    { provide: CSP_NONCE, useFactory: () => inject<RequestContext | null>(REQUEST_CONTEXT, { optional: true })?.nonce ?? null },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
