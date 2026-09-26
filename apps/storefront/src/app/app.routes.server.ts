import { RenderMode, ServerRoute } from '@angular/ssr';

/** Server-render every request so metadata and HTTP status (404) are correct per URL. */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];
