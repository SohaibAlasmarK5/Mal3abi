import Link from "next/link";
import { isLocale } from "@mal3abi/shared/i18n";
import { notFound } from "next/navigation";
import { getMessages } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const { home } = getMessages(locale);
  const otherLocale = locale === "ar" ? "en" : "ar";

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-16">
      <div className="rounded-card border-line bg-surface border p-8">
        <h1 className="text-3xl font-bold">{home.title}</h1>
        <p className="text-muted mt-3 text-lg">{home.subtitle}</p>
        <p className="rounded-control bg-accent-soft mt-6 px-4 py-3 text-sm">{home.status}</p>
        <Link
          href={`/${otherLocale}`}
          className="h-control rounded-control bg-accent text-accent-ink mt-6 inline-flex items-center px-5 font-semibold"
        >
          {home.switchLanguage}
        </Link>
      </div>
    </main>
  );
}
