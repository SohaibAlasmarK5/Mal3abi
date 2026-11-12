"use client";

import { MapPin, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { colorNames, themes } from "@mal3abi/shared/tokens";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckboxField } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import { describedBy, Field, Input, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState, Skeleton } from "@/components/ui/states";
import { StatusBadge, statuses } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimePicker } from "@/components/ui/time-picker";
import { useFormat } from "@/i18n/format";
import { Link } from "@/i18n/navigation";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

const bookings = [
  {
    player: "tablePlayer1",
    date: "2026-11-14T15:00:00Z",
    time: "18:00",
    price: 21,
    status: "confirmed",
  },
  {
    player: "tablePlayer2",
    date: "2026-11-15T17:30:00Z",
    time: "20:30",
    price: 15,
    status: "pending",
  },
  {
    player: "tablePlayer3",
    date: "2026-11-10T16:00:00Z",
    time: "19:00",
    price: 7.5,
    status: "noShow",
  },
] as const;

export function ComponentsShowcase() {
  const t = useTranslations("devComponents");
  const tCommon = useTranslations("common");
  const format = useFormat();
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>("18:00");

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10">
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

      <Section title={t("colors")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {colorNames.map((name) => (
            <div
              key={name}
              className="rounded-control border-line bg-surface flex items-center gap-3 border p-2"
            >
              <span
                className="border-line size-10 shrink-0 rounded-[6px] border"
                style={{ background: `var(--${name})` }}
              />
              <span className="flex min-w-0 flex-col text-sm" dir="ltr">
                <span className="truncate font-medium">{name}</span>
                <span className="text-muted flex flex-col xl:flex-row xl:gap-2">
                  <span>{themes.light[name]}</span>
                  <span>{themes.dark[name]}</span>
                </span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t("buttons")}>
        <div className="flex flex-wrap gap-3">
          <Button>{t("primary")}</Button>
          <Button variant="secondary">{t("secondary")}</Button>
          <Button variant="ghost">{t("ghost")}</Button>
          <Button variant="danger">{t("danger")}</Button>
          <Button loading>{t("saving")}</Button>
          <Button disabled>{t("disabled")}</Button>
          <Button variant="secondary" size="icon" aria-label={t("secondary")}>
            <Search aria-hidden />
          </Button>
        </div>
      </Section>

      <Section title={t("forms")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="court-name" label={t("nameLabel")} hint={t("nameHint")}>
            <Input
              id="court-name"
              placeholder={t("namePlaceholder")}
              aria-describedby={describedBy("court-name", t("nameHint"))}
            />
          </Field>
          <Field id="phone" label={t("phoneLabel")} error={t("phoneError")}>
            <Input
              id="phone"
              type="tel"
              dir="ltr"
              inputMode="tel"
              defaultValue="079"
              aria-invalid
              aria-describedby={describedBy("phone", undefined, t("phoneError"))}
            />
          </Field>
          <Field id="city" label={t("cityLabel")}>
            <Select>
              <SelectTrigger id="city">
                <SelectValue placeholder={t("cityPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amman">{t("cityAmman")}</SelectItem>
                <SelectItem value="irbid">{t("cityIrbid")}</SelectItem>
                <SelectItem value="zarqa">{t("cityZarqa")}</SelectItem>
                <SelectItem value="aqaba">{t("cityAqaba")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex flex-col justify-end">
            <CheckboxField id="needs-approval" label={t("needsApproval")} defaultChecked />
            <CheckboxField id="prepayment" label={t("prepayment")} />
          </div>
          <Field id="policy" label={t("notesLabel")} className="sm:col-span-2">
            <Textarea id="policy" />
          </Field>
        </div>
      </Section>

      <Section title={t("tabs")}>
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">{t("tabUpcoming")}</TabsTrigger>
            <TabsTrigger value="past">{t("tabPast")}</TabsTrigger>
            <TabsTrigger value="cancelled">{t("tabCancelled")}</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="text-muted">
            {t("tabUpcomingBody")}
          </TabsContent>
          <TabsContent value="past" className="text-muted">
            {t("tabPastBody")}
          </TabsContent>
          <TabsContent value="cancelled" className="text-muted">
            {t("tabCancelledBody")}
          </TabsContent>
        </Tabs>
      </Section>

      <Section title={t("modal")}>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" className="self-start">
              {t("modalOpen")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("modalTitle")}</DialogTitle>
              <DialogDescription>{t("modalBody")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">{t("modalKeep")}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="danger">{t("modalConfirm")}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title={t("alerts")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Alert variant="info" title={t("alertInfoTitle")}>
            {t("alertInfoBody")}
          </Alert>
          <Alert variant="success" title={t("alertSuccessTitle")}>
            {t("alertSuccessBody")}
          </Alert>
          <Alert variant="warning" title={t("alertWarningTitle")}>
            {t("alertWarningBody")}
          </Alert>
          <Alert variant="danger" title={t("alertDangerTitle")}>
            {t("alertDangerBody")}
          </Alert>
        </div>
      </Section>

      <Section title={t("cards")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1].map((key) => (
            <Card key={key}>
              <div className="rounded-t-card bg-accent-soft aspect-[16/9]" />
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{t("cardCourt")}</CardTitle>
                  {key === 0 ? <StatusBadge status="featured" /> : null}
                </div>
                <CardDescription className="flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden />
                  {t("cardArea")}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-muted text-sm">{t("cardPitches")}</CardContent>
              <CardFooter className="justify-between">
                <span className="flex gap-1 text-sm">
                  <span className="text-muted">{t("cardFrom")}</span>
                  <span className="font-semibold">{format.price(10)}</span>
                </span>
                <Button>{t("cardBook")}</Button>
              </CardFooter>
            </Card>
          ))}
          <Card className="p-5">
            <Skeleton className="aspect-[16/9] w-full" />
            <Skeleton className="mt-4 h-5 w-2/3" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </Card>
        </div>
      </Section>

      <Section title={t("badges")}>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title={t("table")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tablePlayer")}</TableHead>
              <TableHead>{t("tableDate")}</TableHead>
              <TableHead>{t("tableTime")}</TableHead>
              <TableHead>{t("tablePrice")}</TableHead>
              <TableHead>{t("tableStatus")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((row) => (
              <TableRow key={row.player}>
                <TableCell className="font-medium">{t(row.player)}</TableCell>
                <TableCell>{format.shortDate(new Date(row.date))}</TableCell>
                <TableCell>{format.clock(row.time)}</TableCell>
                <TableCell>{format.price(row.price)}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title={t("calendar")}>
          <Calendar mode="single" selected={date} onSelect={setDate} />
          <p className="text-muted text-sm">
            {date ? t("pickedDate", { date: format.date(date) }) : t("noDate")}
          </p>
        </Section>

        <Section title={t("timePicker")}>
          <Field id="start-time" label={t("startTime")}>
            <TimePicker id="start-time" value={time} onValueChange={setTime} />
          </Field>
          <p className="text-muted text-sm">{t("pickedTime", { time: format.clock(time) })}</p>
        </Section>
      </div>

      <Section title={t("upload")}>
        <ImageUpload />
      </Section>

      <Section title={t("states")}>
        <div className="grid gap-4 lg:grid-cols-3">
          <LoadingState />
          <EmptyState
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={<Button>{t("findCourt")}</Button>}
          />
          <ErrorState action={<Button variant="secondary">{tCommon("retry")}</Button>} />
        </div>
      </Section>

      <Link href="/" className="text-muted underline underline-offset-4">
        {t("home")}
      </Link>
    </main>
  );
}
