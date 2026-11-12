import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { use } from "react";
import type { Locale } from "@mal3abi/shared/i18n";
import { apiMocking } from "@/lib/mocking";
import { MockSignIn } from "./mock-sign-in";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "devSignIn" });
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Stand-in for the Auth Center sign-in while the site runs on mock data. */
export default function MockSignInPage({ params }: Props) {
  if (!apiMocking) notFound();
  const { locale } = use(params);
  setRequestLocale(locale);
  return <MockSignIn />;
}
