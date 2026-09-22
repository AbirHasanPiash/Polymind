import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import {
  AudioLines,
  BarChart3,
  Clapperboard,
  ImageIcon,
  MessageSquareText,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";

import { fetcher } from "../api/client";
import type { UsageSummary } from "../api/types";
import { ProviderMark } from "../components/brand/ProviderMark";
import { Button } from "../components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Page,
  PageHeader,
  Segmented,
  Skeleton,
  StatTile,
} from "../components/ui/primitives";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useModelCatalogue } from "../hooks/useModelCatalogue";
import { formatCompact, formatCost, formatCredits, formatRelativeTime, toNumber } from "../lib/format";
import { displayName, guessProvider } from "../lib/models";
import { cn } from "../lib/utils";

type Range = "7" | "30" | "90";

const CATEGORIES = [
  { key: "chat", label: "Chat", color: "var(--accent)" },
  { key: "image", label: "Images", color: "var(--brand-3)" },
  { key: "audio", label: "Voice", color: "var(--brand-2)" },
  { key: "video", label: "Video", color: "var(--success)" },
] as const;

const KIND_ICON = {
  chat: MessageSquareText,
  image: ImageIcon,
  audio: AudioLines,
  video: Clapperboard,
  purchase: ShoppingBag,
} as const;

const KIND_LABEL: Record<keyof typeof KIND_ICON, string> = {
  chat: "Chat",
  image: "Image",
  audio: "Voice",
  video: "Video",
  purchase: "Purchase",
};

function shortDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function UsagePage() {
  const [range, setRange] = useState<Range>("30");
  const { models } = useModelCatalogue();
  const isPhone = useMediaQuery("(max-width: 639px)");
  const { data, error, isLoading } = useSWR<UsageSummary>(`/users/me/usage?days=${range}`, fetcher, {
    keepPreviousData: true,
  });

  const chartData = useMemo(
    () =>
      (data?.by_day ?? []).map((point) => ({
        date: point.date,
        label: shortDay(point.date),
        chat: toNumber(point.chat),
        image: toNumber(point.image),
        audio: toNumber(point.audio),
        video: toNumber(point.video),
      })),
    [data?.by_day],
  );

  const hasSpend = chartData.some((point) => point.chat + point.image + point.audio + point.video > 0);
  const mediaCount = (data?.counts.images ?? 0) + (data?.counts.audio ?? 0) + (data?.counts.videos ?? 0);
  const totalSpent = toNumber(data?.spent_credits);

  return (
    <Page>
      <PageHeader
        eyebrow="Account"
        title="Usage"
        description="Where your credits go: spend over time, by model and by studio."
        actions={
          <Segmented<Range>
            aria-label="Time range"
            size="md"
            value={range}
            onChange={setRange}
            options={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ]}
          />
        }
      />

      {error && (
        <div className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger" role="alert">
          Could not load your usage. Please try again in a moment.
        </div>
      )}

      {/* Totals */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && !data ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)
        ) : (
          <>
            <StatTile
              label="Balance"
              value={`${formatCredits(data?.balance)} cr`}
              hint={
                <Link to="/dashboard/billing" className="font-medium text-accent hover:underline">
                  Top up
                </Link>
              }
              icon={<Wallet className="h-4 w-4" />}
              tone="accent"
            />
            <StatTile
              label={`Spent · ${range} days`}
              value={`${formatCost(totalSpent)} cr`}
              hint={`≈ ${formatCost(totalSpent / Number(range))} cr per day`}
              icon={<BarChart3 className="h-4 w-4" />}
              tone="info"
            />
            <StatTile
              label="Replies"
              value={formatCompact(data?.counts.messages ?? 0)}
              hint={`${formatCompact(data?.counts.chats ?? 0)} conversations started`}
              icon={<MessageSquareText className="h-4 w-4" />}
              tone="success"
            />
            <StatTile
              label="Media generated"
              value={formatCompact(mediaCount)}
              hint={`${data?.counts.images ?? 0} images · ${data?.counts.audio ?? 0} voice · ${data?.counts.videos ?? 0} video`}
              icon={<Sparkles className="h-4 w-4" />}
              tone="warning"
            />
          </>
        )}
      </div>

      {/* Spend over time */}
      <Card className="mt-6">
        <CardHeader
          title="Spend per day"
          description="Credits charged each day, split by what they paid for."
          action={
            <div className="hidden flex-wrap items-center gap-3 sm:flex">
              {CATEGORIES.map((category) => (
                <span key={category.key} className="flex items-center gap-1.5 text-xs text-fg-muted">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: category.color }} aria-hidden="true" />
                  {category.label}
                  <span className="font-mono text-fg-subtle">{formatCost(data?.spent_by_category[category.key])}</span>
                </span>
              ))}
            </div>
          }
        />
        <CardBody>
          {isLoading && !data ? (
            <Skeleton className="h-72 w-full rounded-xl" />
          ) : hasSpend ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="20%">
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "var(--line)" }}
                    interval="preserveStartEnd"
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: "var(--fg-muted)", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tickFormatter={(value: number) => formatCost(value)}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--surface-2)" }}
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      color: "var(--fg)",
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--fg)", fontWeight: 600 }}
                    itemStyle={{ color: "var(--fg-muted)" }}
                    formatter={(value) => [`${formatCost(Number(value))} cr`]}
                  />
                  {isPhone && <Legend wrapperStyle={{ fontSize: 12, color: "var(--fg-muted)" }} iconType="square" iconSize={10} />}
                  {CATEGORIES.map((category) => (
                    <Bar
                      key={category.key}
                      dataKey={category.key}
                      name={category.label}
                      stackId="spend"
                      fill={category.color}
                      radius={category.key === "video" ? [4, 4, 0, 0] : 0}
                      maxBarSize={28}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={<BarChart3 className="h-6 w-6" />}
              title="No spend in this period"
              description="Send a message or generate some media and it will show up here."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard">Start a chat</Link>
                </Button>
              }
            />
          )}
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* By model */}
        <Card className="lg:col-span-3">
          <CardHeader title="By model" description="Which models answered, and what they cost." />
          <CardBody className="pt-3">
            {isLoading && !data ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-11 w-full" />
                ))}
              </div>
            ) : data && data.by_model.length > 0 ? (
              <ul className="divide-y divide-line">
                {data.by_model.map((row) => {
                  const provider = models.find((m) => m.id === row.model)?.provider ?? guessProvider(row.model);
                  const share = totalSpent > 0 ? Math.min(100, (toNumber(row.credits) / totalSpent) * 100) : 0;
                  return (
                    <li key={row.model} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <ProviderMark provider={provider} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium text-fg">{displayName(row.model, models)}</p>
                            <p className="shrink-0 font-mono text-sm text-fg tabular-nums">{formatCost(row.credits)} cr</p>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-fg-muted">
                            <span>
                              {formatCompact(row.messages)} {row.messages === 1 ? "reply" : "replies"} · {formatCompact(row.tokens)} tokens
                            </span>
                            <span className="font-mono tabular-nums">{share.toFixed(0)}%</span>
                          </div>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="No replies yet" description="Model usage appears here once you have chatted." className="py-10" />
            )}
          </CardBody>
        </Card>

        {/* Recent activity */}
        <Card className="lg:col-span-2">
          <CardHeader title="Recent activity" description="Your latest charges and top-ups." />
          <CardBody className="pt-3">
            {isLoading && !data ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : data && data.recent.length > 0 ? (
              <ul className="divide-y divide-line">
                {data.recent.map((item, index) => {
                  const Icon = KIND_ICON[item.kind];
                  const credits = toNumber(item.credits);
                  const isCredit = item.kind === "purchase" || credits < 0;
                  const content = (
                    <>
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          isCredit ? "bg-success/10 text-success" : "bg-surface-2 text-fg-muted",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-fg">{item.title || KIND_LABEL[item.kind]}</span>
                        <span className="block text-xs text-fg-subtle">
                          {KIND_LABEL[item.kind]} · {formatRelativeTime(item.created_at)}
                        </span>
                      </span>
                      <span className={cn("shrink-0 font-mono text-xs tabular-nums", isCredit ? "text-success" : "text-fg-muted")}>
                        {isCredit ? "+" : "−"}
                        {formatCost(Math.abs(credits))} cr
                      </span>
                    </>
                  );
                  const rowClass = "flex items-center gap-3 py-2.5 first:pt-0 last:pb-0";
                  return (
                    <li key={`${item.kind}-${item.reference_id ?? index}`}>
                      {item.kind === "chat" && item.reference_id ? (
                        <Link to={`/dashboard/chat/${item.reference_id}`} className={cn(rowClass, "-mx-2 rounded-lg px-2 hover:bg-surface-2")}>
                          {content}
                        </Link>
                      ) : (
                        <div className={rowClass}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState title="Nothing yet" description="Charges and purchases will be listed here." className="py-10" />
            )}
          </CardBody>
        </Card>
      </div>
    </Page>
  );
}
