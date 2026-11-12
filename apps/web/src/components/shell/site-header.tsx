import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccountMenu } from "./account-menu";
import { DashboardLink } from "./dashboard-link";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks } from "./nav-links";
import { QuickSearch } from "./quick-search";

/** The top bar of every page. Below 1024px the links and toggles move into the menu. */
export function SiteHeader() {
  return (
    <header className="border-line bg-surface sticky top-0 z-40 border-b">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <Logo />
        <NavLinks className="hidden lg:block" />
        <div className="ms-auto flex items-center gap-2">
          <QuickSearch className="hidden w-56 xl:block" />
          <div className="hidden items-center gap-2 lg:flex">
            <DashboardLink />
            <LocaleSwitcher />
            <ThemeToggle />
            <AccountMenu />
          </div>
          <div className="lg:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
