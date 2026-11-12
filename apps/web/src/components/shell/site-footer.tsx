import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "./logo";

const linkClass = "inline-flex min-h-control items-center text-muted hover:text-ink";

export function SiteFooter() {
  const t = useTranslations("shell");

  const groups = [
    {
      title: t("footer.explore"),
      links: [
        { href: "/courts", label: t("nav.courts") },
        { href: "/matches", label: t("nav.matches") },
        { href: "/owners", label: t("nav.owners") },
      ],
    },
    {
      title: t("footer.help"),
      links: [
        { href: "/contact", label: t("footer.contact") },
        { href: "/privacy", label: t("footer.privacy") },
        { href: "/terms", label: t("footer.terms") },
      ],
    },
  ];

  return (
    <footer className="border-line bg-surface mt-auto border-t">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="flex flex-col gap-2 lg:col-span-2">
          <Logo className="self-start" />
          <p className="text-muted max-w-sm">{t("footer.tagline")}</p>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="mb-2 font-semibold">{group.title}</h2>
            <ul>
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-line border-t">
        <p className="text-muted mx-auto max-w-7xl px-4 py-4 text-sm sm:px-6">
          {t("footer.rights", { year: String(new Date().getFullYear()) })}
        </p>
      </div>
    </footer>
  );
}
