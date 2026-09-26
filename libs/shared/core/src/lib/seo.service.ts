import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { APP_CONFIG } from './tokens';

export interface SeoData {
  title: string;
  description?: string;
  /** Path such as `/p/blue-shirt`; combined with siteUrl. */
  path?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);
  private readonly config = inject(APP_CONFIG);

  set(data: SeoData): void {
    const fullTitle = `${data.title} | ${this.config.siteName}`;
    this.title.setTitle(fullTitle);
    this.setName('description', data.description);
    this.setName('robots', data.noindex ? 'noindex,follow' : 'index,follow');
    this.setProp('og:title', fullTitle);
    this.setProp('og:description', data.description);
    this.setProp('og:type', 'website');
    this.setProp('og:site_name', this.config.siteName);
    this.setProp('og:image', data.image);
    this.setCanonical(data.path);
    this.setJsonLd(data.jsonLd);
  }

  private setName(name: string, content?: string): void {
    if (content) this.meta.updateTag({ name, content });
    else this.meta.removeTag(`name="${name}"`);
  }

  private setProp(property: string, content?: string): void {
    if (content) this.meta.updateTag({ property, content });
    else this.meta.removeTag(`property="${property}"`);
  }

  private setCanonical(path?: string): void {
    const existing = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (path === undefined) {
      existing?.remove();
      return;
    }
    const link = existing ?? this.doc.head.appendChild(this.doc.createElement('link'));
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', new URL(path, this.config.siteUrl).toString());
  }

  private setJsonLd(data?: Record<string, unknown>): void {
    const id = 'seo-jsonld';
    this.doc.getElementById(id)?.remove();
    if (!data) return;
    const script = this.doc.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    // Escape "<" so data can never close the script element.
    script.text = JSON.stringify(data).replace(/</g, '\\u003c');
    this.doc.head.appendChild(script);
  }
}
