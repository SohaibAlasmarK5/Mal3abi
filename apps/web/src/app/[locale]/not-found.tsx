import { NotFoundContent } from "@/components/shell/not-found-content";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";

/** 404 for pages outside the site frame (for example internal pages in production). */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="content" className="flex flex-1 flex-col">
        <NotFoundContent />
      </main>
      <SiteFooter />
    </div>
  );
}
