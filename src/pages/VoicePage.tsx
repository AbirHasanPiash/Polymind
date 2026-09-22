import { useMemo, useState } from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { AudioLines, Download, Play } from "lucide-react";

import api, { fetcher, getErrorMessage } from "../api/client";
import type { GeneratedAudio, Voice } from "../api/types";
import { ProviderMark } from "../components/brand/ProviderMark";
import { CostEstimate } from "../components/studio/CostEstimate";
import { CardAction, ResultCard } from "../components/studio/ResultCard";
import {
  GeneratingCard,
  JustGenerated,
  ResultsGrid,
  SkeletonGrid,
  StorageDisabled,
  StudioLayout,
  StudioSection,
  StudioTips,
} from "../components/studio/StudioLayout";
import { VoicePicker } from "../components/studio/VoicePicker";
import { CharCount, ControlLabel } from "../components/studio/controls";
import { useDeleteItem } from "../components/studio/useDeleteItem";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/overlays";
import { Badge, Card, CardBody, CardHeader, EmptyState, Input, Page, PageHeader, Skeleton, Textarea } from "../components/ui/primitives";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useAwaitNewItem } from "../hooks/useAwaitNewItem";
import { useFeatures } from "../hooks/useFeatures";
import { downloadFile, timestampedName } from "../lib/download";
import { formatCost, formatRelativeTime } from "../lib/format";
import { PROVIDER_META } from "../lib/models";

type VoicesResponse = { voices: Voice[]; default: string; max_chars: number };

const GENERATION_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 3000;
const AUDIO_KEY = "/media/list";
const MAX_INSTRUCTIONS = 300;

const TIPS = [
  { heading: "Punctuation is pacing", body: "Commas and full stops become pauses; an ellipsis is a breath. Write the way you want it read." },
  { heading: "Studio voices for finals", body: "Chirp 3 HD and the OpenAI voices cost a little more per character but sound noticeably more natural." },
  { heading: "Steer OpenAI voices", body: "Add a delivery hint such as “warm, unhurried, like a bedtime story” — it changes tone, speed and emphasis." },
];

export default function VoicePage() {
  const { features } = useFeatures();
  const { refreshProfile } = useAuth();
  const toast = useToast();

  const { data: voicesData, isLoading: loadingVoices } = useSWRImmutable<VoicesResponse>("/media/voices", fetcher);
  const voices = useMemo(() => voicesData?.voices ?? [], [voicesData]);
  const maxChars = voicesData?.max_chars ?? 4096;

  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);

  const voice =
    voices.find((v) => v.id === voiceId && v.enabled) ??
    voices.find((v) => v.id === voicesData?.default && v.enabled) ??
    voices.find((v) => v.enabled) ??
    voices[0];
  const cost = voice && text.trim() ? (Number(voice.credits_per_1k_chars) * text.length) / 1000 : null;
  const steerable = voice?.provider === "openai";

  const { data: audioFiles, mutate, isLoading } = useSWR<GeneratedAudio[]>(AUDIO_KEY, fetcher, {
    refreshInterval: isGenerating ? POLL_INTERVAL_MS : 0,
  });

  useAwaitNewItem<GeneratedAudio>({
    items: audioFiles,
    isWaiting: isGenerating,
    timeoutMs: GENERATION_TIMEOUT_MS,
    onArrived: (audio) => {
      setLastGeneratedId(audio.id);
      setText("");
      setIsGenerating(false);
      void refreshProfile();
    },
    onTimeout: () => {
      setIsGenerating(false);
      toast.error("This is taking longer than expected. It will appear in your history shortly.");
    },
  });

  const deletion = useDeleteItem<GeneratedAudio>({ mutate, endpoint: (id) => `/media/audio/${id}`, label: "Audio" });

  const handleGenerate = async () => {
    const trimmed = text.trim();
    if (!trimmed || !voice || isGenerating) return;

    setLastGeneratedId(null);
    setIsGenerating(true);
    try {
      await api.post("/media/generate", {
        text: trimmed,
        voice_name: voice.id,
        instructions: steerable && instructions.trim() ? instructions.trim() : undefined,
      });
      void refreshProfile();
      void mutate();
    } catch (error) {
      setIsGenerating(false);
      toast.error(getErrorMessage(error, "Failed to generate audio"));
    }
  };

  const download = async (audio: GeneratedAudio) => {
    await downloadFile(audio.public_url, timestampedName("polymind-voice", audio.created_at ?? undefined, "mp3"));
  };

  const lastGenerated = lastGeneratedId ? audioFiles?.find((audio) => audio.id === lastGeneratedId) : undefined;
  const history = (audioFiles ?? []).filter((audio) => audio.id !== lastGeneratedId);
  const nothingConfigured = !loadingVoices && voices.every((v) => !v.enabled);

  if (!features.storage) {
    return (
      <Page>
        <PageHeader eyebrow="Studio" title="Voice" description="Turn text into natural speech." />
        <div className="mt-8">
          <StorageDisabled what="audio files" />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Studio"
        title="Voice"
        description="Turn any text into natural speech with Google and OpenAI voices. Priced per character, before you press play."
      />

      <div className="mt-6">
        <StudioLayout
          form={
            <Card>
              <CardHeader title="Text to speech" description="Paste a script, choose a voice, and download the MP3 a few seconds later." />
              <CardBody className="space-y-5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <ControlLabel htmlFor="voice-text">Text</ControlLabel>
                    <CharCount value={text.length} max={maxChars} />
                  </div>
                  <Textarea
                    id="voice-text"
                    value={text}
                    onChange={(event) => setText(event.target.value.slice(0, maxChars))}
                    placeholder="Welcome to Polymind. In this short walkthrough we will…"
                    rows={6}
                    disabled={isGenerating}
                  />
                </div>

                <div>
                  <ControlLabel>Voice</ControlLabel>
                  {loadingVoices ? (
                    <Skeleton className="h-11" />
                  ) : nothingConfigured ? (
                    <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-fg-muted">
                      No speech provider is configured on this server yet.
                    </p>
                  ) : (
                    <VoicePicker voices={voices} value={voice?.id ?? ""} onChange={setVoiceId} disabled={isGenerating} />
                  )}
                </div>

                {steerable && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <ControlLabel htmlFor="voice-instructions">Delivery hint</ControlLabel>
                      <CharCount value={instructions.length} max={MAX_INSTRUCTIONS} />
                    </div>
                    <Input
                      id="voice-instructions"
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value.slice(0, MAX_INSTRUCTIONS))}
                      placeholder="e.g. cheerful and quick, like a morning radio host"
                      disabled={isGenerating}
                    />
                    <p className="mt-1 text-[11px] text-fg-subtle">OpenAI voices follow tone, pace and emphasis hints.</p>
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <CostEstimate
                    credits={cost}
                    className="sm:max-w-sm sm:flex-1"
                    note={voice ? `${Number(voice.credits_per_1k_chars).toFixed(2)} credits per 1,000 characters with ${voice.name}` : undefined}
                  />
                  <Button
                    type="button"
                    variant="gradient"
                    size="lg"
                    onClick={() => void handleGenerate()}
                    disabled={!text.trim() || !voice || !voice.enabled || isGenerating}
                    loading={isGenerating}
                    className="w-full sm:w-auto"
                  >
                    {!isGenerating && <Play />}
                    {isGenerating ? "Synthesising…" : "Generate speech"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          }
          aside={<StudioTips title="Sounding natural" items={TIPS} />}
        />
      </div>

      {isGenerating && <GeneratingCard label="Synthesising speech…" aspect="audio" />}

      {lastGenerated && !isGenerating && (
        <JustGenerated>
          <AudioCard audio={lastGenerated} voices={voices} highlighted onDelete={deletion.request} onDownload={download} />
        </JustGenerated>
      )}

      <StudioSection title="Your recordings" count={audioFiles?.length} description="MP3 files stored in your library, ready to download or reuse.">
        {isLoading ? (
          <SkeletonGrid aspect="audio" />
        ) : (audioFiles ?? []).length === 0 ? (
          <EmptyState icon={<AudioLines className="h-6 w-6" />} title="No recordings yet" description="Speech you generate will be kept here." />
        ) : history.length > 0 ? (
          <ResultsGrid>
            {history.map((audio) => (
              <AudioCard key={audio.id} audio={audio} voices={voices} onDelete={deletion.request} onDownload={download} />
            ))}
          </ResultsGrid>
        ) : null}
      </StudioSection>

      <ConfirmDialog
        open={deletion.target !== null}
        onOpenChange={(open) => !open && deletion.cancel()}
        title="Delete this recording?"
        description="The audio file will be removed from your library and from storage."
        loading={deletion.busy}
        onConfirm={deletion.confirm}
      />
    </Page>
  );
}

function AudioCard({
  audio,
  voices,
  highlighted = false,
  onDelete,
  onDownload,
}: {
  audio: GeneratedAudio;
  voices: Voice[];
  highlighted?: boolean;
  onDelete: (id: string) => void;
  onDownload: (audio: GeneratedAudio) => Promise<void>;
}) {
  const [downloading, setDownloading] = useState(false);
  const voice = voices.find((v) => v.id === audio.voice_name);
  const provider = voice?.provider ?? (audio.provider === "openai" ? "openai" : "google");

  return (
    <ResultCard
      highlighted={highlighted}
      onDelete={() => onDelete(audio.id)}
      media={
        <div className="flex items-center gap-3 bg-surface-2/70 p-3 pr-14">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white">
            <AudioLines className="h-5 w-5" />
          </span>
          <audio controls preload="none" src={audio.public_url} className="h-10 w-full min-w-0" />
        </div>
      }
      header={
        <>
          <ProviderMark provider={provider} size="xs" />
          <span className="font-medium text-fg">{voice?.name ?? audio.voice_name ?? "Voice"}</span>
          <span className="text-fg-subtle">· {PROVIDER_META[provider].label}</span>
          {voice?.tier === "premium" && <Badge tone="accent">Studio</Badge>}
          <span className="text-fg-subtle">· {formatRelativeTime(audio.created_at)}</span>
        </>
      }
      body={<p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">“{audio.text_prompt}”</p>}
      footer={
        <>
          <span className="font-mono text-[11px] text-fg-subtle">{formatCost(audio.cost)} cr</span>
          <CardAction
            label={downloading ? "Downloading…" : "Download MP3"}
            busy={downloading}
            onClick={() => {
              setDownloading(true);
              void onDownload(audio).finally(() => setDownloading(false));
            }}
          >
            <Download className="h-4 w-4" />
          </CardAction>
        </>
      }
    />
  );
}
