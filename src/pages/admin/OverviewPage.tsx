import { useMemo, useState } from "react";
import useSWR from "swr";
import { Activity, AudioLines, Clapperboard, Coins, DollarSign, ImageIcon, MessageSquareText, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { fetcher } from "../../api/client";
import type { AdminOverview } from "../../api/types";
import { ChartCard } from "../../components/admin/ChartCard";
import { CHART, CHART_ITEM_STYLE, CHART_LABEL_STYLE, CHART_TOOLTIP_STYLE, fillDays, shortDay } from "../../components/admin/charts";
import { EmptyRow, SkeletonRows, TableShell, Td, Th, Tr } from "../../components/admin/DataTable";
import { ProviderMark } from "../../components/brand/ProviderMark";
import { Avatar, Card, CardBody, CardHeader, EmptyState, Page, PageHeader, Segmented, Skeleton, StatTile } from "../../components/ui/primitives";
import { useModelCatalogue } from "../../hooks/useModelCatalogue";
import { formatCompact, formatCredits, formatCurrency, toNumber } from "../../lib/format";
import { displayName, guessProvider } from "../../lib/models";
import { cn } from "../../lib/utils";

type Range = "7" | "30" | "90";

const REFRESH_INTERVAL_MS = 60_000;

const CATEGORY_META = [
  { key: "chat", label: "Chat", icon: MessageSquareText, color: "var(--accent)" },
  { key: "image", label: "Images", icon: ImageIcon, color: "var(--brand-3)" },
  { key: "audio", label: "Voice", icon: AudioLines, color: "var(--brand-2)" },
  { key: "video", label: "Video", icon: Clapperboard, color: "var(--success)" },
] as const;

export default function OverviewPage() {
  const [range, setRange] = useState<Range>("30");
  const days = Number(range);
  const { models } = useModelCatalogue();
  const { data, error, isLoading, isValidating } = useSWR<AdminOverview>(`/admin/stats/overview?days=${days}`, fetcher, {
    refreshInterval: REFRESH_INTERVAL_MS,
    keepPreviousData: true,
  });

  const revenue = useMemo(() => fillDays(days, data?.revenue_trend ?? []), [days, data?.revenue_trend]);
  const usage = useMemo(() => fillDays(days, data?.usage_trend ?? []), [days, data?.usage_trend]);
  const growth = useMemo(() => fillDays(days, data?.user_growth_trend ?? []), [days, data?.user_growth_trend]);

  const categoryTotal = CATEGORY_META.reduce((sum, item) => sum + toNumber(data?.spend_by_category?.[item.key]), 0);

  return (
    <Page>
      <PageHeader
        eyebrow="Admin"
        title="Platform overview"
        description="Revenue, growth and model usage across every account."
        actions={
          <>
            <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted">
              <span className="relative flex h-2 w-2">
                <span className={cn("absolute inline-flex h-full w-full rounded-full bg-success opacity-75", isValidating && "animate-ping")} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              Live · refreshes every minute
            </span>
            <Segmented<Range>
              aria-label="Time range"
              size="md"
              value={range}
              onChange={setRange}
              options={[
                { value: "7", label: "7d" },
                { value: "30", label: "30d" },
                { value: "90", label: "90d" },
              ]}
            />
          </>
        }
      />

      {error && !data ? (
        <EmptyState className="mt-8" title="Could not load analytics" description="The stats endpoint did not respond. Try again in a moment." />
      ) : (
        <div className="mt-8 space-y-6">
          {/* Headline numbers */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading && !data ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)
            ) : (
              <>
                <StatTile
                  label="Total revenue"
                  value={formatCurrency(data?.total_revenue)}
                  hint="Completed purchases, all time"
                  icon={<DollarSign className="h-4 w-4" />}
                  tone="success"
                />
                <StatTile
                  label="Users"
                  value={(data?.total_users ?? 0).toLocaleString()}
                  hint={`+${(data?.new_users ?? 0).toLocaleString()} new · ${(data?.active_users ?? 0).toLocaleString()} active in ${days}d`}
                  icon={<Users className="h-4 w-4" />}
                  tone="info"
                />
                <StatTile
                  label="Assistant replies"
                  value={(data?.total_messages ?? 0).toLocaleString()}
                  hint={`${(data?.total_chats ?? 0).toLocaleString()} conversations, all time`}
                  icon={<MessageSquareText className="h-4 w-4" />}
                  tone="accent"
                />
                <StatTile
                  label="AI cost"
                  value={`${formatCredits(data?.total_ai_cost)} cr`}
                  hint={`${formatCompact(data?.total_tokens_consumed)} tokens, all time`}
                  icon={<Coins className="h-4 w-4" />}
                  tone="warning"
                />
              </>
            )}
          </div>

          {/* Trends */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title={`Revenue · last ${days} days`} description="USD from completed purchases per day.">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill-revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART.success} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDay} stroke={CHART.grid} tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} minTickGap={24} />
                  <YAxis stroke={CHART.grid} tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_LABEL_STYLE} itemStyle={CHART_ITEM_STYLE} labelFormatter={(label) => shortDay(String(label))} formatter={(value: unknown) => [formatCurrency(value as number), "Revenue"]} />
                  <Area type="monotone" dataKey="value" stroke={CHART.success} strokeWidth={2} fill="url(#fill-revenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title={`Usage · last ${days} days`} description="Credits spent on chat replies per day.">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={usage} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill-usage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART.accent} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={CHART.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDay} stroke={CHART.grid} tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} minTickGap={24} />
                  <YAxis stroke={CHART.grid} tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_LABEL_STYLE} itemStyle={CHART_ITEM_STYLE} labelFormatter={(label) => shortDay(String(label))} formatter={(value: unknown) => [`${formatCredits(value as number)} cr`, "Spent"]} />
                  <Area type="monotone" dataKey="value" stroke={CHART.accent} strokeWidth={2} fill="url(#fill-usage)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ChartCard title={`Sign-ups · last ${days} days`} description="New accounts per day.">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={growth} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke={CHART.grid} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={shortDay} stroke={CHART.grid} tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} stroke={CHART.grid} tick={{ fill: CHART.tick, fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
                    <Tooltip cursor={{ fill: "var(--surface-2)" }} contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_LABEL_STYLE} itemStyle={CHART_ITEM_STYLE} labelFormatter={(label) => shortDay(String(label))} formatter={(value: unknown) => [Number(value).toLocaleString(), "Sign-ups"]} />
                    <Bar dataKey="value" fill={CHART.brand2} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <Card>
              <CardHeader title="Spend by category" description="All-time credits, by studio." />
              <CardBody className="space-y-4 pt-4">
                {CATEGORY_META.map((item) => {
                  const value = toNumber(data?.spend_by_category?.[item.key]);
                  const share = categoryTotal > 0 ? (value / categoryTotal) * 100 : 0;
                  return (
                    <div key={item.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-fg">
                          <item.icon className="h-4 w-4 text-fg-muted" />
                          {item.label}
                        </span>
                        <span className="font-mono text-xs text-fg-muted">
                          {formatCredits(value)} cr · {share.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${share}%`, background: item.color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="grid grid-cols-2 gap-2 border-t border-line pt-4 text-center">
                  <Breakdown label="Images" value={data?.total_images_generated} />
                  <Breakdown label="Audio" value={data?.total_audio_generated} />
                  <Breakdown label="Videos" value={data?.total_videos_generated} />
                  <Breakdown label="Chats" value={data?.total_chats} />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Breakdown tables */}
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-fg">
                <Activity className="h-4 w-4 text-accent" /> Usage by model · {days}d
              </h2>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Model</Th>
                    <Th align="right">Replies</Th>
                    <Th align="right">Tokens</Th>
                    <Th align="right">Credits</Th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !data ? (
                    <SkeletonRows columns={4} rows={4} />
                  ) : !data || data.usage_by_model.length === 0 ? (
                    <EmptyRow columns={4}>No chat usage in this window.</EmptyRow>
                  ) : (
                    data.usage_by_model.map((row) => {
                      const provider = models.find((m) => m.id === row.model)?.provider ?? guessProvider(row.model);
                      return (
                        <Tr key={row.model}>
                          <Td>
                            <span className="flex items-center gap-2.5">
                              <ProviderMark provider={provider} size="sm" />
                              <span className="min-w-0">
                                <span className="block truncate font-medium">{displayName(row.model, models)}</span>
                                <span className="block truncate font-mono text-[11px] text-fg-subtle">{row.model}</span>
                              </span>
                            </span>
                          </Td>
                          <Td align="right" className="font-mono">{row.messages.toLocaleString()}</Td>
                          <Td align="right" className="font-mono">{formatCompact(row.tokens)}</Td>
                          <Td align="right" className="font-mono">{formatCredits(row.credits)}</Td>
                        </Tr>
                      );
                    })
                  )}
                </tbody>
              </TableShell>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-fg">
                <Users className="h-4 w-4 text-accent" /> Top users by spend · {days}d
              </h2>
              <TableShell>
                <thead>
                  <tr>
                    <Th>User</Th>
                    <Th align="right">Replies</Th>
                    <Th align="right">Credits</Th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !data ? (
                    <SkeletonRows columns={3} rows={4} />
                  ) : !data || data.top_users.length === 0 ? (
                    <EmptyRow columns={3}>Nobody has chatted in this window yet.</EmptyRow>
                  ) : (
                    data.top_users.map((row) => (
                      <Tr key={row.user_id}>
                        <Td>
                          <span className="flex items-center gap-2.5">
                            <Avatar name={row.email} size="sm" />
                            <span className="truncate">{row.email}</span>
                          </span>
                        </Td>
                        <Td align="right" className="font-mono">{row.messages.toLocaleString()}</Td>
                        <Td align="right" className="font-mono">{formatCredits(row.credits)}</Td>
                      </Tr>
                    ))
                  )}
                </tbody>
              </TableShell>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

function Breakdown({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl bg-surface-2/60 px-2 py-2.5">
      <p className="text-lg font-semibold text-fg tabular-nums">{(value ?? 0).toLocaleString()}</p>
      <p className="text-[11px] tracking-wider text-fg-subtle uppercase">{label}</p>
    </div>
  );
}
