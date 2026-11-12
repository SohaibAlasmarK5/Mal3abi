"use client";

import {
  getListMyBookingsQueryKey,
  useCancelBooking,
  useCreateBooking,
  useGetCourtAvailability,
  useListCities,
  useListMyBookings,
  useListSports,
  useSearchCourts,
  type AvailabilitySlot,
  type CourtSummary,
} from "@mal3abi/shared/api";
import { localized, type Locale } from "@mal3abi/shared/i18n";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFormat } from "@/i18n/format";
import { useErrorMessage } from "@/lib/api-errors";
import { hasRole, useSession, useSignIn, useSignOut } from "@/lib/session";
import { cn } from "@/lib/utils";

const sampleDate = "2026-11-14";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function SessionSection() {
  const t = useTranslations("session");
  const tPage = useTranslations("devApi");
  const session = useSession();
  const signIn = useSignIn();
  const signOut = useSignOut();

  return (
    <Section title={tPage("session")}>
      {session.status === "loading" ? (
        <Skeleton className="h-control w-64" />
      ) : session.status === "signedIn" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-medium">{t("signedInAs", { name: session.account.name })}</span>
            <span className="text-muted text-sm">{t(`role.${session.account.role}`)}</span>
          </div>
          <Button variant="secondary" onClick={() => void signOut()}>
            {t("signOut")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-muted">{t("signedOut")}</span>
          <Button onClick={() => signIn()}>{t("signIn")}</Button>
        </div>
      )}
    </Section>
  );
}

function Courts({ onPick, picked }: { onPick: (court: CourtSummary) => void; picked?: string }) {
  const t = useTranslations("devApi");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const [sportId, setSportId] = useState<string | undefined>();
  const sports = useListSports();
  const cities = useListCities();
  const courts = useSearchCourts({ sportId });

  const areaName = (court: CourtSummary) => {
    const city = cities.data?.find((c) => c.id === court.cityId);
    const area = city?.areas.find((a) => a.id === court.areaId);
    return [localized(city?.name, locale), localized(area?.name, locale)]
      .filter(Boolean)
      .join(locale === "ar" ? "، " : ", ");
  };

  return (
    <>
      <Section title={t("sports")}>
        {sports.isPending ? (
          <Skeleton className="h-control w-full" />
        ) : sports.isError ? (
          <Alert variant="danger">{errorMessage(sports.error)}</Alert>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={sportId ? "secondary" : "primary"}
              onClick={() => setSportId(undefined)}
            >
              {t("allSports")}
            </Button>
            {sports.data.map((sport) => (
              <Button
                key={sport.id}
                variant={sportId === sport.id ? "primary" : "secondary"}
                onClick={() => setSportId(sport.id)}
              >
                {localized(sport.name, locale)}
              </Button>
            ))}
          </div>
        )}
      </Section>

      <Section title={t("courts")}>
        {courts.isPending ? (
          <LoadingState />
        ) : courts.isError ? (
          <ErrorState
            description={errorMessage(courts.error)}
            action={
              <Button variant="secondary" onClick={() => void courts.refetch()}>
                {tCommon("retry")}
              </Button>
            }
          />
        ) : courts.data.items.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <p className="text-muted text-sm">
              {t("courtsCount", { count: String(courts.data.total) })}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2">
              {courts.data.items.map((court) => (
                <li key={court.id}>
                  <button
                    type="button"
                    onClick={() => onPick(court)}
                    className={cn(
                      "rounded-control border-line hover:bg-accent-soft flex w-full flex-col gap-1 border p-4 text-start",
                      picked === court.id && "border-accent bg-accent-soft",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{localized(court.name, locale)}</span>
                      {court.isFeatured ? <StatusBadge status="featured" /> : null}
                    </span>
                    <span className="text-muted text-sm">{areaName(court)}</span>
                    <span className="text-sm">
                      {t("from", { price: format.price(court.priceFrom) })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </>
  );
}

function Availability({ court }: { court?: CourtSummary }) {
  const t = useTranslations("devApi");
  const locale = useLocale() as Locale;
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const slots = useGetCourtAvailability(
    court?.id ?? "",
    { date: sampleDate },
    { query: { enabled: !!court } },
  );
  const book = useCreateBooking({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() }),
    },
  });

  if (!court) {
    return (
      <Section title={t("availability", { court: "" })}>
        <p className="text-muted">{t("pickCourt")}</p>
      </Section>
    );
  }

  const firstPitch = slots.data?.[0]?.pitchId;
  const pitchSlots: AvailabilitySlot[] =
    slots.data?.filter((slot) => slot.pitchId === firstPitch) ?? [];

  return (
    <Section title={t("availability", { court: localized(court.name, locale) })}>
      {slots.isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : slots.isError ? (
        <Alert variant="danger">{errorMessage(slots.error)}</Alert>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {pitchSlots.map((slot) => (
            <Button
              key={slot.start}
              variant={slot.status === "available" ? "secondary" : "ghost"}
              disabled={slot.status === "closed" || book.isPending}
              title={t(`slot.${slot.status}`)}
              className={cn(
                "flex-col gap-0 text-sm",
                slot.status !== "available" && "text-muted line-through",
              )}
              onClick={() =>
                book.mutate({
                  data: { pitchId: slot.pitchId, start: slot.start, durationMinutes: 60 },
                })
              }
            >
              {format.time(new Date(slot.start))}
            </Button>
          ))}
        </div>
      )}
      {book.isError ? <Alert variant="danger">{errorMessage(book.error)}</Alert> : null}
      {book.isSuccess ? (
        <Alert variant="success">
          {t("booked", {
            court: localized(book.data.courtName, locale),
            time: format.time(new Date(book.data.start)),
          })}
        </Alert>
      ) : null}
    </Section>
  );
}

function MyBookings() {
  const t = useTranslations("devApi");
  const locale = useLocale() as Locale;
  const format = useFormat();
  const errorMessage = useErrorMessage();
  const queryClient = useQueryClient();
  const session = useSession();
  const signedIn = session.status === "signedIn" && hasRole(session.account, "player");
  const bookings = useListMyBookings(undefined, { query: { enabled: signedIn } });
  const cancel = useCancelBooking({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() }),
    },
  });

  return (
    <Section title={t("myBookings")}>
      {!signedIn ? (
        <p className="text-muted">{t("signInToSee")}</p>
      ) : bookings.isPending ? (
        <LoadingState />
      ) : bookings.isError ? (
        <Alert variant="danger">{errorMessage(bookings.error)}</Alert>
      ) : (
        <ul className="divide-line divide-y">
          {bookings.data.map((booking) => (
            <li key={booking.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex flex-col">
                <span className="font-medium">{localized(booking.courtName, locale)}</span>
                <span className="text-muted text-sm">
                  {format.shortDate(new Date(booking.start))} {format.time(new Date(booking.start))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{format.price(booking.totalPrice)}</span>
                <StatusBadge status={booking.status} />
                {booking.status === "confirmed" || booking.status === "pending" ? (
                  <Button
                    variant="ghost"
                    loading={cancel.isPending && cancel.variables?.bookingId === booking.id}
                    onClick={() => cancel.mutate({ bookingId: booking.id })}
                  >
                    {t("cancel")}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function ApiReview() {
  const t = useTranslations("devApi");
  const [court, setCourt] = useState<CourtSummary | undefined>();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted mt-2 max-w-2xl">{t("intro")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher />
        </div>
      </header>
      <SessionSection />
      <Courts onPick={setCourt} picked={court?.id} />
      <Availability court={court} />
      <MyBookings />
    </main>
  );
}
