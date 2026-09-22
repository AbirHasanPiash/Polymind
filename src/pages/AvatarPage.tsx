import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { AlertTriangle, Check, Clapperboard, Download, ImageIcon, Link2, Upload, X } from "lucide-react";

import api, { fetcher, getErrorMessage } from "../api/client";
import type { GeneratedImage, GeneratedVideo, Voice } from "../api/types";
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
import { Badge, Card, CardBody, CardHeader, EmptyState, Input, Page, PageHeader, Segmented, Skeleton, Textarea } from "../components/ui/primitives";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useAwaitNewItem } from "../hooks/useAwaitNewItem";
import { useFeatures } from "../hooks/useFeatures";
import { downloadFile, timestampedName } from "../lib/download";
import { MAX_FILE_SIZE_BYTES, UPLOAD_LIMITS } from "../lib/env";
import { formatCost, formatRelativeTime } from "../lib/format";
import { cn } from "../lib/utils";

type VoicesResponse = { voices: Voice[]; default: string; max_chars: number };
type Source = "preset" | "library" | "upload" | "url";

const PRESETS = [
  { id: "emma", name: "Emma", url: "https://pub-f05b7ab0255f4775b9b9ca5637a40853.r2.dev/presets/emma.png" },
  { id: "james", name: "James", url: "https://pub-f05b7ab0255f4775b9b9ca5637a40853.r2.dev/presets/james.png" },
  { id: "sarah", name: "Sarah", url: "https://pub-f05b7ab0255f4775b9b9ca5637a40853.r2.dev/presets/sarah.png" },
  { id: "michael", name: "Michael", url: "https://pub-f05b7ab0255f4775b9b9ca5637a40853.r2.dev/presets/michael.png" },
];

/** Mirrors the avatar script limit the studio has always used. */
const MAX_SCRIPT = 500;
const SUBMIT_TIMEOUT_MS = 90_000;
const ACTIVE_POLL_MS = 5000;
const VIDEOS_KEY = "/media/videos/list";

const TIPS = [
  { heading: "Use a front-facing portrait", body: "Face centred, eyes visible, neutral expression. Sunglasses, tilted heads and busy backgrounds hurt lip-sync." },
  { heading: "Short scripts render fast", body: "Around 30–60 seconds of speech is the sweet spot. Long monologues cost more and take minutes to render." },
  { heading: "Make the face first", body: "Generate a character in the Image studio, then pick it from “My images” to animate it." },
];

const STATUS_LABEL: Record<GeneratedVideo["status"], string> = {
  processing: "Preparing narration",
  processing_external: "Rendering video",
  completed: "Ready",
  failed: "Failed",
};

export default function AvatarPage() {
  const { features } = useFeatures();
  const { refreshProfile } = useAuth();
  const toast = useToast();

  const { data: voicesData, isLoading: loadingVoices } = useSWRImmutable<VoicesResponse>("/media/voices", fetcher);
  const voices = useMemo(() => voicesData?.voices ?? [], [voicesData]);

  const [source, setSource] = useState<Source>("preset");
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [libraryUrl, setLibraryUrl] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [script, setScript] = useState("");
  const [voiceId, setVoiceId] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const voice =
    voices.find((v) => v.id === voiceId && v.enabled) ??
    voices.find((v) => v.id === voicesData?.default && v.enabled) ??
    voices.find((v) => v.enabled) ??
    voices[0];
  const narrationCost = voice && script.trim() ? (Number(voice.credits_per_1k_chars) * script.length) / 1000 : null;

  const uploadPreview = useMemo(() => (uploadFile ? URL.createObjectURL(uploadFile) : null), [uploadFile]);
  useEffect(() => {
    if (!uploadPreview) return;
    return () => URL.revokeObjectURL(uploadPreview);
  }, [uploadPreview]);

  // The image that will be animated, for the preview strip and the request.
  const selectedPreview =
    source === "preset"
      ? (PRESETS.find((p) => p.id === presetId)?.url ?? null)
      : source === "library"
        ? libraryUrl
        : source === "upload"
          ? uploadPreview
          : urlInput.trim() || null;

  const { data: videos, mutate, isLoading } = useSWR<GeneratedVideo[]>(VIDEOS_KEY, fetcher, {
    // Poll only while a render is in progress.
    refreshInterval: (latest) =>
      isAnimating || latest?.some((video) => video.status.startsWith("processing")) ? ACTIVE_POLL_MS : 0,
  });
  const { data: library, isLoading: loadingLibrary } = useSWR<GeneratedImage[]>(
    source === "library" ? "/media/images/list?limit=20" : null,
    fetcher,
  );

  useAwaitNewItem<GeneratedVideo>({
    items: videos,
    isWaiting: isAnimating,
    timeoutMs: SUBMIT_TIMEOUT_MS,
    onArrived: (video) => {
      setLastVideoId(video.id);
      setScript("");
      setIsAnimating(false);
      void refreshProfile();
      toast.success("Rendering started — the video appears below when it is ready.");
    },
    onTimeout: () => {
      setIsAnimating(false);
      toast.error("Still processing in the background. Check your library shortly.");
    },
  });

  const deletion = useDeleteItem<GeneratedVideo>({ mutate, endpoint: (id) => `/media/videos/${id}`, label: "Video" });

  const pickUpload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Avatar image must be under ${UPLOAD_LIMITS.maxFileSizeMb} MB`);
      return;
    }
    setUploadFile(file);
  };

  const handleAnimate = async () => {
    const trimmed = script.trim();
    if (!trimmed || !voice || isAnimating) return;

    setIsAnimating(true);
    try {
      let avatarUrl: string | null = null;
      if (source === "preset") avatarUrl = PRESETS.find((p) => p.id === presetId)?.url ?? null;
      else if (source === "library") avatarUrl = libraryUrl;
      else if (source === "url") avatarUrl = urlInput.trim() || null;
      else if (uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        const { data } = await api.post<{ public_url: string }>("/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        avatarUrl = data.public_url;
      }
      if (!avatarUrl) {
        setIsAnimating(false);
        toast.error("Choose an avatar image first");
        return;
      }

      setLastVideoId(null);
      const { data } = await api.post<{ video_id: string; estimated_cost: number }>("/media/generate-avatar", {
        text: trimmed,
        voice_name: voice.id,
        avatar_url: avatarUrl,
      });
      toast.success(`Reserved ${formatCost(data.estimated_cost)} credits — rendering started`);
      void refreshProfile();
      void mutate();
    } catch (error) {
      setIsAnimating(false);
      toast.error(getErrorMessage(error, "Failed to start the avatar render"));
    }
  };

  const download = async (video: GeneratedVideo) => {
    if (!video.public_url) return;
    await downloadFile(video.public_url, timestampedName("polymind-avatar", video.created_at ?? undefined, "mp4"));
  };

  const lastVideo = lastVideoId ? videos?.find((video) => video.id === lastVideoId) : undefined;
  const history = (videos ?? []).filter((video) => video.id !== lastVideoId);
  const canSubmit = Boolean(script.trim() && voice?.enabled && selectedPreview && !isAnimating);

  if (!features.storage || !features.avatar_video) {
    return (
      <Page>
        <PageHeader eyebrow="Studio" title="Avatar video" description="Turn a portrait and a script into a talking video." />
        <div className="mt-8">
          {!features.storage ? (
            <StorageDisabled what="videos" />
          ) : (
            <EmptyState
              icon={<Clapperboard className="h-6 w-6" />}
              title="Avatar video is not configured"
              description="This studio needs a D-ID API key on the server (DID_API_KEY). Ask the administrator to enable it."
              action={
                <Link to="/dashboard/images" className="text-sm font-medium text-accent hover:underline">
                  Try the Image studio instead
                </Link>
              }
            />
          )}
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Studio"
        title="Avatar video"
        description="Pick a face, write a script, choose a voice — Polymind narrates it and renders a lip-synced talking video in the background."
      />

      <div className="mt-6">
        <StudioLayout
          form={
            <Card>
              <CardHeader
                title="Create a talking avatar"
                description="Renders take a minute or two. You can keep working; the video lands in your library."
              />
              <CardBody className="space-y-5">
                <div>
                  <ControlLabel>Avatar</ControlLabel>
                  <Segmented<Source>
                    aria-label="Avatar source"
                    size="md"
                    value={source}
                    onChange={setSource}
                    className="mb-3 w-full overflow-x-auto scrollbar-none [&>button]:flex-1"
                    options={[
                      { value: "preset", label: "Presets" },
                      { value: "library", label: "My images" },
                      { value: "upload", label: "Upload" },
                      { value: "url", label: "URL" },
                    ]}
                  />

                  {source === "preset" && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {PRESETS.map((preset) => {
                        const selected = presetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setPresetId(preset.id)}
                            disabled={isAnimating}
                            aria-pressed={selected}
                            className={cn(
                              "group relative aspect-square overflow-hidden rounded-xl border-2 transition disabled:opacity-50",
                              selected ? "border-accent shadow-md shadow-accent/20" : "border-transparent hover:border-line-strong",
                            )}
                          >
                            <img src={preset.url} alt={preset.name} className="h-full w-full object-cover" />
                            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-center text-xs font-medium text-white">
                              {preset.name}
                            </span>
                            {selected && (
                              <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {source === "library" &&
                    (loadingLibrary ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Skeleton key={index} className="aspect-square" />
                        ))}
                      </div>
                    ) : (library ?? []).length === 0 ? (
                      <EmptyState
                        className="py-8"
                        icon={<ImageIcon className="h-5 w-5" />}
                        title="No images in your library"
                        description="Generate a portrait in the Image studio, then pick it here."
                        action={
                          <Link to="/dashboard/images" className="text-sm font-medium text-accent hover:underline">
                            Open Image studio
                          </Link>
                        }
                      />
                    ) : (
                      <div className="custom-scrollbar grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
                        {(library ?? []).map((image) => {
                          const selected = libraryUrl === image.public_url;
                          return (
                            <button
                              key={image.id}
                              type="button"
                              onClick={() => setLibraryUrl(image.public_url)}
                              disabled={isAnimating}
                              aria-pressed={selected}
                              title={image.prompt}
                              className={cn(
                                "relative aspect-square overflow-hidden rounded-lg border-2 transition disabled:opacity-50",
                                selected ? "border-accent" : "border-transparent hover:border-line-strong",
                              )}
                            >
                              <img src={image.public_url} alt={image.prompt} loading="lazy" className="h-full w-full object-cover" />
                              {selected && (
                                <span className="absolute inset-0 flex items-center justify-center bg-accent/25">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-fg">
                                    <Check className="h-3.5 w-3.5" />
                                  </span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}

                  {source === "upload" && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(event) => {
                          pickUpload(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      {uploadPreview ? (
                        <div className="flex items-center gap-4 rounded-xl border border-line bg-surface-2/60 p-3">
                          <img src={uploadPreview} alt="Selected avatar" className="h-20 w-20 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-fg">{uploadFile?.name}</p>
                            <p className="text-xs text-fg-muted">Uploaded when you generate.</p>
                          </div>
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setUploadFile(null)} aria-label="Remove image">
                            <X />
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isAnimating}
                          className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-strong bg-surface-2/40 text-fg-muted hover:border-accent hover:text-fg disabled:opacity-50"
                        >
                          <Upload className="h-6 w-6" />
                          <span className="text-sm font-medium">Choose a portrait</span>
                          <span className="text-xs text-fg-subtle">PNG, JPEG or WebP up to {UPLOAD_LIMITS.maxFileSizeMb} MB</span>
                        </button>
                      )}
                    </div>
                  )}

                  {source === "url" && (
                    <div className="relative">
                      <Link2 className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                      <Input
                        value={urlInput}
                        onChange={(event) => setUrlInput(event.target.value)}
                        placeholder="https://example.com/portrait.png"
                        className="pl-9"
                        inputMode="url"
                        disabled={isAnimating}
                        aria-label="Image URL"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <ControlLabel htmlFor="avatar-script">Script</ControlLabel>
                    <CharCount value={script.length} max={MAX_SCRIPT} />
                  </div>
                  <Textarea
                    id="avatar-script"
                    value={script}
                    onChange={(event) => setScript(event.target.value.slice(0, MAX_SCRIPT))}
                    placeholder="Hi, I'm your Polymind guide. In the next minute I'll show you…"
                    rows={4}
                    disabled={isAnimating}
                  />
                </div>

                <div>
                  <ControlLabel>Voice</ControlLabel>
                  {loadingVoices ? <Skeleton className="h-11" /> : <VoicePicker voices={voices} value={voice?.id ?? ""} onChange={setVoiceId} disabled={isAnimating} />}
                </div>

                <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                    {selectedPreview && (
                      <img src={selectedPreview} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-line object-cover" />
                    )}
                    <CostEstimate
                      credits={narrationCost}
                      unit="narration"
                      className="min-w-0 flex-1"
                      note="Plus video rendering, billed per 15-second block. The exact total is reserved when the job is accepted."
                    />
                  </div>
                  <Button type="button" variant="gradient" size="lg" onClick={() => void handleAnimate()} disabled={!canSubmit} loading={isAnimating} className="w-full sm:w-auto">
                    {!isAnimating && <Clapperboard />}
                    {isAnimating ? "Starting…" : "Generate video"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          }
          aside={<StudioTips title="Better renders" items={TIPS} />}
        />
      </div>

      {isAnimating && <GeneratingCard label="Narrating your script…" aspect="video" />}

      {lastVideo && !isAnimating && (
        <JustGenerated label="Just created">
          <VideoCard video={lastVideo} highlighted onDelete={deletion.request} onDownload={download} />
        </JustGenerated>
      )}

      <StudioSection title="Your videos" count={videos?.length} description="Renders in progress update automatically.">
        {isLoading ? (
          <SkeletonGrid aspect="video" />
        ) : (videos ?? []).length === 0 ? (
          <EmptyState icon={<Clapperboard className="h-6 w-6" />} title="No videos yet" description="Your talking avatars will appear here." />
        ) : history.length > 0 ? (
          <ResultsGrid>
            {history.map((video) => (
              <VideoCard key={video.id} video={video} onDelete={deletion.request} onDownload={download} />
            ))}
          </ResultsGrid>
        ) : null}
      </StudioSection>

      <ConfirmDialog
        open={deletion.target !== null}
        onOpenChange={(open) => !open && deletion.cancel()}
        title="Delete this video?"
        description="The video and its narration will be removed from your library and from storage."
        loading={deletion.busy}
        onConfirm={deletion.confirm}
      />
    </Page>
  );
}

function VideoCard({
  video,
  highlighted = false,
  onDelete,
  onDownload,
}: {
  video: GeneratedVideo;
  highlighted?: boolean;
  onDelete: (id: string) => void;
  onDownload: (video: GeneratedVideo) => Promise<void>;
}) {
  const [downloading, setDownloading] = useState(false);
  const processing = video.status === "processing" || video.status === "processing_external";
  const failed = video.status === "failed";

  return (
    <ResultCard
      highlighted={highlighted}
      onDelete={() => onDelete(video.id)}
      media={
        <div className="relative aspect-video w-full overflow-hidden bg-surface-2">
          {video.status === "completed" && video.public_url ? (
            <video src={video.public_url} controls preload="metadata" poster={video.thumbnail_url ?? video.avatar_image_url} className="h-full w-full object-cover" />
          ) : (
            <>
              <img src={video.avatar_image_url} alt="" className={cn("h-full w-full object-cover", processing && "scale-105 blur-sm opacity-60")} />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-canvas/40 backdrop-blur-[2px]">
                {processing ? (
                  <>
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-accent" />
                    <span className="text-xs font-medium text-fg">{STATUS_LABEL[video.status]}…</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-6 w-6 text-danger" />
                    <span className="max-w-[90%] truncate px-3 text-center text-xs font-medium text-danger" title={video.error_message ?? undefined}>
                      {video.error_message ?? "Render failed — credits were refunded"}
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      }
      header={
        <>
          <Badge tone={failed ? "danger" : processing ? "warning" : "success"}>{STATUS_LABEL[video.status]}</Badge>
          <span className="text-fg-subtle">· D-ID · {formatRelativeTime(video.created_at)}</span>
        </>
      }
      body={<p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">“{video.script_text}”</p>}
      footer={
        <>
          <span className="font-mono text-[11px] text-fg-subtle">{formatCost(video.cost)} cr</span>
          <CardAction
            label={downloading ? "Downloading…" : "Download MP4"}
            busy={downloading}
            disabled={video.status !== "completed" || !video.public_url}
            onClick={() => {
              setDownloading(true);
              void onDownload(video).finally(() => setDownloading(false));
            }}
          >
            <Download className="h-4 w-4" />
          </CardAction>
        </>
      }
    />
  );
}
