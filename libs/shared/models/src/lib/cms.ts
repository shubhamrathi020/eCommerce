export interface CmsPage {
  slug: string;
  title: string;
  /** HTML; always sanitised before render (steering/security.md). */
  body: string;
  seo?: { title?: string; description?: string };
}
