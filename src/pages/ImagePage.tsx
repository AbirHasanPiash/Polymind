import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import { Download, ImageIcon, ImagePlus, Paperclip, WandSparkles, X } from "lucide-react";

import api, { fetcher, getErrorMessage } from "../api/client";
import type { GeneratedImage, ImageModelOption } from "../api/types";
import { ProviderMark } from "../components/brand/ProviderMark";
import { CostEstimate } from "../components/studio/CostEstimate";
import { ImageModelPicker } from "../components/studio/ImageModelPicker";
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
import { CharCount, ChipGroup, ControlLabel } from "../components/studio/controls";
import { useDeleteItem } from "../components/studio/useDeleteItem";
import { Button } from "../components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, Tooltip } from "../components/ui/overlays";
import { Badge, Card, CardBody, CardHeader, EmptyState, Page, PageHeader, Skeleton, Textarea } from "../components/ui/primitives";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useAwaitNewItem } from "../hooks/useAwaitNewItem";
import { useFeatures } from "../hooks/useFeatures";
import { downloadFile, timestampedName } from "../lib/download";
import { MAX_FILE_SIZE_BYTES, UPLOAD_LIMITS } from "../lib/env";
import { formatCost, formatRelativeTime } from "../lib/format";
import { cn } from "../lib/utils";

type ImageOptions = { models: ImageModelOption[]; default: string };
type Reference = { kind: "file"; file: File } | { kind: "url"; url: string } | null;

/** Mirrors MAX_PROMPT_LENGTH on the backend. */
const MAX_PROMPT = 4000;
const GENERATION_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 3000;
const IMAGES_KEY = "/media/images/list";

const TIPS = [
  { heading: "Describe the scene, then the style", body: "Subject, setting and lighting first; camera, medium and mood last. Specific beats long." },
  { heading: "Edit instead of regenerating", body: "Attach a reference image and describe only the change you want — the composition stays put." },
  { heading: "Pick quality per job", body: "Low is ideal for thumbnails and drafts; reserve high or 4K for final renders." },
];

export default function ImagePage() {
  const { features } = useFeatures();
  const { refreshProfile } = useAuth();
  const toast = useToast();

  const { data: optionsData, isLoading: loadingOptions } = useSWRImmutable<ImageOptions>("/media/images/options", fetcher);
  const models = useMemo(() => optionsData?.models ?? [], [optionsData]);

  const [prompt, setPrompt] = useState("");
  const [modelId, setModelId] = useState<string | null>(null);
  const [choice, setChoice] = useState<{ quality?: string; size?: string }>({});
  const [reference, setReference] = useState<Reference>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<GeneratedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The model in use: the user's pick when it is still offered, else the
  // server default, else the first model that is configured.
  const model =
    models.find((m) => m.id === modelId && m.enabled) ??
    models.find((m) => m.id === optionsData?.default && m.enabled) ??
    models.find((m) => m.enabled) ??
    models[0];
  const quality = model && choice.quality && model.prices[choice.quality] ? choice.quality : model?.default_quality;
  const sizesForQuality = model && quality ? Object.keys(model.prices[quality] ?? {}) : [];
  const size =
    choice.size && sizesForQuality.includes(choice.size)
      ? choice.size
      : model && sizesForQuality.includes(model.default_size)
        ? model.default_size
        : sizesForQuality[0];
  const cost = model && quality && size ? Number(model.prices[quality][size]) : null;
  const canReference = Boolean(model?.supports_reference);

  const referencePreview = useMemo(
    () => (reference?.kind === "file" ? URL.createObjectURL(reference.file) : reference?.kind === "url" ? reference.url : null),
    [reference],
  );
  useEffect(() => {
    if (reference?.kind !== "file" || !referencePreview) return;
    return () => URL.revokeObjectURL(referencePreview);
  }, [reference, referencePreview]);

  const { data: images, mutate, isLoading } = useSWR<GeneratedImage[]>(IMAGES_KEY, fetcher, {
    // Only poll while a render is in flight.
    refreshInterval: isGenerating ? POLL_INTERVAL_MS : 0,
  });

  useAwaitNewItem<GeneratedImage>({
    items: images,
    isWaiting: isGenerating,
    timeoutMs: GENERATION_TIMEOUT_MS,
    onArrived: (image) => {
      setLastGeneratedId(image.id);
      setPrompt("");
      setReference(null);
      setIsGenerating(false);
      void refreshProfile();
    },
    onTimeout: () => {
      setIsGenerating(false);
      toast.error("This is taking longer than expected. It will appear in your history shortly.");
    },
  });

  const deletion = useDeleteItem<GeneratedImage>({ mutate, endpoint: (id) => `/media/images/${id}`, label: "Image" });

  const pickReferenceFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Reference image must be under ${UPLOAD_LIMITS.maxFileSizeMb} MB`);
      return;
    }
    setReference({ kind: "file", file });
  };

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || !model || !quality || !size || isGenerating) return;

    setLastGeneratedId(null);
    setIsGenerating(true);
    try {
      let referenceUrl: string | null = null;
      if (reference && canReference) {
        if (reference.kind === "url") {
          referenceUrl = reference.url;
        } else {
          const formData = new FormData();
          formData.append("file", reference.file);
          const { data } = await api.post<{ public_url: string }>("/media/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          referenceUrl = data.public_url;
        }
      }
      await api.post("/media/generate-image", {
        prompt: trimmed,
        model: model.id,
        quality,
        size,
        reference_image_url: referenceUrl,
      });
      // Credits are reserved when the job is accepted.
      void refreshProfile();
      void mutate();
    } catch (error) {
      setIsGenerating(false);
      toast.error(getErrorMessage(error, "Failed to start image generation"));
    }
  };

  const download = async (image: GeneratedImage) => {
    await downloadFile(image.public_url, timestampedName(`polymind-${image.model}`, image.created_at ?? undefined, "png"));
  };

  const lastGenerated = lastGeneratedId ? images?.find((image) => image.id === lastGeneratedId) : undefined;
  const history = (images ?? []).filter((image) => image.id !== lastGeneratedId);
  const nothingConfigured = !loadingOptions && models.every((m) => !m.enabled);

  if (!features.storage) {
    return (
      <Page>
        <PageHeader eyebrow="Studio" title="Images" description="Generate and edit images with the latest models." />
        <div className="mt-8">
          <StorageDisabled what="images" />
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Studio"
        title="Images"
        description="Generate from a prompt or edit a reference image with GPT Image and Nano Banana. Every render is priced before you start."
      />

      <div className="mt-6">
        <StudioLayout
          form={
            <Card>
              <CardHeader title="Create an image" description="Describe what you want to see. Attach a reference to edit instead of starting from scratch." />
              <CardBody className="space-y-5">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <ControlLabel htmlFor="image-prompt">Prompt</ControlLabel>
                    <CharCount value={prompt.length} max={MAX_PROMPT} />
                  </div>
                  <Textarea
                    id="image-prompt"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value.slice(0, MAX_PROMPT))}
                    placeholder="A quiet harbour at dawn, painted in loose watercolour, soft mist, warm light on the boats…"
                    rows={4}
                    disabled={isGenerating}
                  />
                  {canReference && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        onChange={(event) => {
                          pickReferenceFile(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                      {referencePreview ? (
                        <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent-soft py-1.5 pr-1.5 pl-2 text-xs">
                          <img src={referencePreview} alt="" className="h-9 w-9 rounded-md object-cover" />
                          <span className="font-medium text-fg">Editing from reference</span>
                          <button
                            type="button"
                            onClick={() => setReference(null)}
                            className="rounded-md p-1.5 text-fg-muted hover:bg-surface hover:text-danger"
                            aria-label="Remove reference image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isGenerating}>
                          <Paperclip /> Attach reference image
                        </Button>
                      )}
                      <span className="text-[11px] text-fg-subtle">PNG, JPEG or WebP up to {UPLOAD_LIMITS.maxFileSizeMb} MB</span>
                    </div>
                  )}
                </div>

                <div>
                  <ControlLabel>Model</ControlLabel>
                  {loadingOptions ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Skeleton className="h-20" />
                      <Skeleton className="h-20" />
                    </div>
                  ) : nothingConfigured ? (
                    <p className="rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-fg-muted">
                      No image provider is configured on this server yet.
                    </p>
                  ) : (
                    <ImageModelPicker
                      models={models}
                      value={model?.id}
                      onChange={(id) => {
                        setModelId(id);
                        setChoice({});
                        if (!models.find((m) => m.id === id)?.supports_reference) setReference(null);
                      }}
                      disabled={isGenerating}
                    />
                  )}
                </div>

                {model && quality && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <ChipGroup
                      label="Quality"
                      value={quality}
                      onChange={(value) => setChoice((current) => ({ ...current, quality: value }))}
                      options={model.qualities.map((q) => ({ value: q.value, label: q.label }))}
                      disabled={isGenerating}
                    />
                    <ChipGroup
                      label="Shape"
                      value={size ?? ""}
                      onChange={(value) => setChoice((current) => ({ ...current, size: value }))}
                      options={model.sizes.filter((s) => sizesForQuality.includes(s.value)).map((s) => ({ value: s.value, label: s.label }))}
                      disabled={isGenerating}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <CostEstimate credits={cost} unit="image" className="sm:max-w-sm sm:flex-1" />
                  <Button
                    type="button"
                    variant="gradient"
                    size="lg"
                    onClick={() => void handleGenerate()}
                    disabled={!prompt.trim() || !model || !model.enabled || isGenerating}
                    loading={isGenerating}
                    className="w-full sm:w-auto"
                  >
                    {!isGenerating && <WandSparkles />}
                    {isGenerating ? "Rendering…" : reference && canReference ? "Edit image" : "Generate"}
                  </Button>
                </div>
              </CardBody>
            </Card>
          }
          aside={<StudioTips title="Getting good results" items={TIPS} />}
        />
      </div>

      {isGenerating && <GeneratingCard label="Rendering your image…" aspect="square" />}

      {lastGenerated && !isGenerating && (
        <JustGenerated>
          <ImageCard
            image={lastGenerated}
            models={models}
            highlighted
            onDelete={deletion.request}
            onPreview={setLightbox}
            onDownload={download}
            onUseAsReference={canReference ? (url) => setReference({ kind: "url", url }) : undefined}
          />
        </JustGenerated>
      )}

      <StudioSection title="Your images" count={images?.length} description="Stored securely in your library. Download originals any time.">
        {isLoading ? (
          <SkeletonGrid aspect="square" />
        ) : (images ?? []).length === 0 ? (
          <EmptyState icon={<ImageIcon className="h-6 w-6" />} title="No images yet" description="Your generated images will appear here. Start with a prompt above." />
        ) : history.length > 0 ? (
          <ResultsGrid>
            {history.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                models={models}
                onDelete={deletion.request}
                onPreview={setLightbox}
                onDownload={download}
                onUseAsReference={canReference ? (url) => setReference({ kind: "url", url }) : undefined}
              />
            ))}
          </ResultsGrid>
        ) : null}
      </StudioSection>

      <ConfirmDialog
        open={deletion.target !== null}
        onOpenChange={(open) => !open && deletion.cancel()}
        title="Delete this image?"
        description="It will be removed from your library and from storage. This cannot be undone."
        loading={deletion.busy}
        onConfirm={deletion.confirm}
      />

      <Dialog open={lightbox !== null} onOpenChange={(open) => !open && setLightbox(null)}>
        {lightbox && (
          <DialogContent
            size="lg"
            title={models.find((m) => m.id === lightbox.model)?.display_name ?? lightbox.model}
            description={`${lightbox.size} · ${lightbox.quality} · ${formatCost(lightbox.cost)} credits`}
          >
            <img src={lightbox.public_url} alt={lightbox.prompt} className="max-h-[65vh] w-full rounded-xl object-contain bg-surface-2" />
            <p className="mt-3 text-sm text-fg-muted">{lightbox.revised_prompt ?? lightbox.prompt}</p>
            <div className="mt-4 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => void download(lightbox)}>
                <Download /> Download
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </Page>
  );
}

function ImageCard({
  image,
  models,
  highlighted = false,
  onDelete,
  onPreview,
  onDownload,
  onUseAsReference,
}: {
  image: GeneratedImage;
  models: ImageModelOption[];
  highlighted?: boolean;
  onDelete: (id: string) => void;
  onPreview: (image: GeneratedImage) => void;
  onDownload: (image: GeneratedImage) => Promise<void>;
  onUseAsReference?: (url: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const model = models.find((m) => m.id === image.model);

  return (
    <ResultCard
      highlighted={highlighted}
      onDelete={() => onDelete(image.id)}
      media={
        <button type="button" onClick={() => onPreview(image)} className="relative block aspect-square w-full overflow-hidden bg-surface-2" aria-label="Open full size">
          <img src={image.public_url} alt={image.prompt} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
          <span className="absolute bottom-2 left-2 flex gap-1">
            <Badge className={cn("bg-canvas/85 text-fg backdrop-blur")}>{image.size}</Badge>
            <Badge className="bg-canvas/85 text-fg uppercase backdrop-blur">{image.quality}</Badge>
          </span>
        </button>
      }
      header={
        <>
          <ProviderMark provider={model?.provider} size="xs" />
          <span className="font-medium text-fg">{model?.display_name ?? image.model}</span>
          <span className="text-fg-subtle">· {formatRelativeTime(image.created_at)}</span>
        </>
      }
      body={<p className="line-clamp-3 text-sm leading-relaxed text-fg-muted">{image.prompt}</p>}
      footer={
        <>
          <span className="font-mono text-[11px] text-fg-subtle">{formatCost(image.cost)} cr</span>
          <span className="flex items-center">
            {onUseAsReference && (
              <Tooltip content="Use as reference for an edit">
                <button
                  type="button"
                  onClick={() => onUseAsReference(image.public_url)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
                  aria-label="Use as reference"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
              </Tooltip>
            )}
            <CardAction
              label={downloading ? "Downloading…" : "Download original"}
              busy={downloading}
              onClick={() => {
                setDownloading(true);
                void onDownload(image).finally(() => setDownloading(false));
              }}
            >
              <Download className="h-4 w-4" />
            </CardAction>
          </span>
        </>
      }
    />
  );
}
