import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import useSWRImmutable from "swr/immutable";
import api, { fetcher, getErrorMessage } from "../api/client";
import {
  PhotoIcon,
  PlayCircleIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  SparklesIcon,
  ChevronDownIcon,
  CheckIcon,
  ClockIcon,
  SwatchIcon,
  ArrowsPointingOutIcon,
  StarIcon,
  PaperClipIcon,
  XMarkIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useAwaitNewItem } from "../hooks/useAwaitNewItem";
import { downloadFile, timestampedName } from "../lib/download";
import { MAX_FILE_SIZE_BYTES, UPLOAD_LIMITS } from "../lib/env";
import DeleteModal from "../components/DeleteModal";

// Types
interface ImageFile {
  id: string;
  prompt: string;
  public_url: string;
  created_at: string;
  model: string;
  size: string;
  quality: string;
}

interface ConfigOption {
  id: string;
  name: string;
  value: string;
}

// Configuration Options
const MODELS: ConfigOption[] = [
  { id: "dall-e-3", name: "DALL·E 3", value: "dall-e-3" },
  { id: "gpt-image-1.5", name: "GPT Image 1.5", value: "gpt-image-1.5" },
];

/**
 * Sizes are model-specific and come from GET /media/images/options, which is
 * generated from the same pricing table the backend validates against. The
 * hard-coded list this replaces offered DALL-E aspect ratios for every model,
 * and the backend now rejects the combinations it cannot price.
 */
type ImageOptions = Record<string, { qualities: string[]; sizes: string[] }>;

const SIZE_LABELS: Record<string, string> = {
  "1024x1024": "Square",
  "1024x1536": "Portrait",
  "1536x1024": "Landscape",
  "1024x1792": "Portrait",
  "1792x1024": "Landscape",
};

const QUALITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  standard: "Standard",
  hd: "HD Quality",
};

const FALLBACK_OPTIONS: ImageOptions = {
  "gpt-image-1.5": {
    qualities: ["low", "medium", "high"],
    sizes: ["1024x1024", "1024x1536", "1536x1024"],
  },
  "dall-e-3": {
    qualities: ["standard", "hd"],
    sizes: ["1024x1024", "1024x1792", "1792x1024"],
  },
};

const GENERATION_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 3000;

export default function ImagePage() {
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const [prompt, setPrompt] = useState("");

  // Configuration State
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [qualityValue, setQualityValue] = useState("standard");
  const [sizeValue, setSizeValue] = useState("1024x1024");

  // Reference Image State
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch History
  const {
    data: imageFiles,
    mutate,
    isLoading,
  } = useSWR<ImageFile[]>("/media/images/list", fetcher, {
    // Only poll while a render is in flight.
    refreshInterval: isGenerating ? POLL_INTERVAL_MS : 0,
  });

  // Catalogue of valid model/quality/size combinations, straight from the API.
  const { data: optionsData } = useSWRImmutable<{ options: ImageOptions }>(
    "/media/images/options",
    fetcher,
  );
  const options = optionsData?.options ?? FALLBACK_OPTIONS;
  const modelOptions = options[selectedModel.value] ?? FALLBACK_OPTIONS["gpt-image-1.5"];

  const currentQualities: ConfigOption[] = useMemo(
    () =>
      modelOptions.qualities.map((value) => ({
        id: value,
        value,
        name: QUALITY_LABELS[value] ?? value,
      })),
    [modelOptions],
  );

  const currentSizes: ConfigOption[] = useMemo(
    () =>
      modelOptions.sizes.map((value) => ({
        id: value,
        value,
        name: `${SIZE_LABELS[value] ?? value} (${value})`,
      })),
    [modelOptions],
  );

  const selectedQuality =
    currentQualities.find((option) => option.value === qualityValue) ?? currentQualities[0];
  const selectedSize =
    currentSizes.find((option) => option.value === sizeValue) ?? currentSizes[0];

  // Switching models can invalidate the current choice, so snap back to a
  // combination this model actually supports.
  useEffect(() => {
    if (!modelOptions.qualities.includes(qualityValue)) {
      setQualityValue(modelOptions.qualities[Math.min(1, modelOptions.qualities.length - 1)]);
    }
    if (!modelOptions.sizes.includes(sizeValue)) {
      setSizeValue(modelOptions.sizes[0]);
    }
    if (selectedModel.value !== "gpt-image-1.5") {
      setReferenceImage(null);
      setReferencePreview(null);
    }
  }, [modelOptions, qualityValue, sizeValue, selectedModel.value]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Checked here so the user is told immediately rather than after an upload
    // that the backend would reject anyway.
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`Reference image must be under ${UPLOAD_LIMITS.maxFileSizeMb} MB`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setReferenceImage(file);
    setReferencePreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(file);
    });
  };

  const clearReferenceImage = useCallback(() => {
    setReferenceImage(null);
    setReferencePreview((previous) => {
      // Without the revoke, every picked file leaks a blob for the tab's lifetime.
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // Release the last preview when leaving the page.
  useEffect(() => () => setReferencePreview((previous) => {
    if (previous) URL.revokeObjectURL(previous);
    return null;
  }), []);

  useAwaitNewItem<ImageFile>({
    items: imageFiles,
    isWaiting: isGenerating,
    timeoutMs: GENERATION_TIMEOUT_MS,
    onArrived: (image) => {
      setLastGeneratedId(image.id);
      setPrompt("");
      clearReferenceImage();
      setIsGenerating(false);
      void refreshProfile();
    },
    onTimeout: () => {
      setIsGenerating(false);
      toast.error("This is taking longer than expected. It will appear in your history shortly.");
    },
  });

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || isGenerating) return;

    setLastGeneratedId(null);
    setIsGenerating(true);

    try {
      let referenceImageUrl: string | null = null;

      if (selectedModel.value === "gpt-image-1.5" && referenceImage) {
        const formData = new FormData();
        formData.append("file", referenceImage);
        const uploadRes = await api.post<{ public_url: string }>("/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        referenceImageUrl = uploadRes.data.public_url;
      }

      await api.post("/media/generate-image", {
        prompt: trimmed,
        model: selectedModel.value,
        quality: selectedQuality.value,
        size: selectedSize.value,
        reference_image_url: referenceImageUrl,
      });

      // Credits are taken when the job is queued.
      void refreshProfile();
      void mutate();
    } catch (err) {
      setIsGenerating(false);
      toast.error(getErrorMessage(err, "Failed to generate image"));
    }
  };

  // DELETE HANDLERS
  const promptDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    // Filter local list immediately for instant feel
    const previousData = imageFiles;
    mutate(
      (currentData) => currentData?.filter((img) => img.id !== itemToDelete),
      false // Do not revalidate yet
    );

    try {
      await api.delete(`/media/images/${itemToDelete}`);
      void mutate();
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success("Image deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete image"));
      void mutate(previousData, false);
    } finally {
      setIsDeleting(false);
    }
  };

  const lastGeneratedImage =
    lastGeneratedId && imageFiles
      ? imageFiles.find((f) => f.id === lastGeneratedId)
      : null;

  const historyImages =
    imageFiles?.filter((f) => f.id !== lastGeneratedId) || [];

  return (
    <div className="flex flex-col h-full bg-blue-50 dark:bg-gradient-to-br dark:from-[#0a0b0f] dark:via-[#0d0e14] dark:to-[#0a0b0f] relative overflow-hidden transition-colors duration-300">
      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) setDeleteModalOpen(false);
        }}
        onConfirm={confirmDelete}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone and will remove permanently."
        isDeleting={isDeleting}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-pink-500 blur-xl opacity-30 animate-pulse"></div>
                <PhotoIcon className="w-8 h-8 sm:w-10 sm:h-10 text-pink-500 relative z-10" />
              </div>
              <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Image Studio
              </h1>
            </div>
            <p className="text-slate-500 dark:text-gray-400 text-sm sm:text-base ml-0 sm:ml-16">
              Create stunning visuals with state-of-the-art generative models
            </p>
          </div>

          {/* Generator Section */}
          <div className="relative z-20 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
            <div className="lg:col-span-2 space-y-6">
              {/* Prompt Input Card */}
              <div className="relative z-30">
                {/* Card Background */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-all">
                  <div className="p-4 sm:p-6 relative">
                    <div className="flex items-center gap-2 mb-3">
                      <SparklesIcon className="w-4 h-4 text-pink-500 dark:text-pink-400" />
                      <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                        Image Prompt
                      </span>
                    </div>

                    {/* Textarea */}
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Describe the image you want to create in detail..."
                      className="w-full h-32 sm:h-40 bg-slate-50 dark:bg-slate-950/30 text-slate-900 dark:text-gray-100 p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/50 placeholder-slate-400 dark:placeholder-gray-600 text-base sm:text-lg border border-slate-200 dark:border-slate-800/50 transition-all custom-scrollbar"
                      maxLength={1000}
                    />

                    {/* Reference Image Preview Overlay */}
                    {referencePreview && (
                      <div className="absolute bottom-8 right-8 z-10 animate-in fade-in zoom-in duration-200">
                        <div className="relative group">
                          <img
                            src={referencePreview}
                            alt="Reference"
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-pink-500/50 shadow-lg"
                          />
                          <button
                            onClick={clearReferenceImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center py-0.5 rounded-b-lg backdrop-blur-sm">
                            Ref Image
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Toolbar */}
                  <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20 rounded-b-2xl">
                    <div className="flex flex-col gap-4">
                      {/* Configurations Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 z-50">
                        <ConfigSelector
                          label="Model"
                          icon={<StarIcon className="w-4 h-4" />}
                          selected={selectedModel}
                          onChange={setSelectedModel}
                          options={MODELS}
                        />
                        <ConfigSelector
                          label="Quality"
                          icon={<SwatchIcon className="w-4 h-4" />}
                          selected={selectedQuality}
                          onChange={(option) => setQualityValue(option.value)}
                          options={currentQualities}
                        />
                        <ConfigSelector
                          label="Size"
                          icon={<ArrowsPointingOutIcon className="w-4 h-4" />}
                          selected={selectedSize}
                          onChange={(option) => setSizeValue(option.value)}
                          options={currentSizes}
                        />
                      </div>

                      {/* Action Row */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 dark:text-gray-500 font-mono hidden sm:inline-block">
                            {prompt.length} / 1000 chars
                          </span>

                          {/* Reference Image Upload Trigger (Only for GPT 1.5) */}
                          {selectedModel.value === "gpt-image-1.5" && (
                            <>
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                              />
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800/50 hover:bg-pink-100 dark:hover:bg-pink-900/20 text-xs text-slate-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-300 border border-transparent hover:border-pink-300 dark:hover:border-pink-500/30 transition-all"
                                title="Attach Reference Image"
                              >
                                <PaperClipIcon className="w-3.5 h-3.5" />
                                <span className="hidden xs:inline">
                                  Reference Img
                                </span>
                              </button>
                            </>
                          )}
                        </div>

                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating || !prompt.trim()}
                          className={`w-full sm:w-auto relative flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-pink-500/25 ${
                            isGenerating || !prompt.trim()
                              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90 active:scale-95"
                          }`}
                        >
                          {isGenerating ? (
                            <>
                              <ArrowPathIcon className="w-5 h-5 animate-spin" />
                              <span>Dreaming...</span>
                            </>
                          ) : (
                            <>
                              <PlayCircleIcon className="w-5 h-5" />
                              Generate
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Generated Image */}
              {lastGeneratedImage && !isGenerating && (
                <div className="relative z-10 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-2 mb-3">
                    <SparklesIcon className="w-4 h-4 text-emerald-500 dark:text-green-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      Just Created
                    </span>
                  </div>
                  <ImageCard
                    file={lastGeneratedImage}
                    isHighlighted
                    onDelete={promptDelete}
                  />
                </div>
              )}
            </div>

            {/* Feature/Info Sidebar */}
            <div className="space-y-4 relative z-0">
              <div className="bg-white dark:bg-pink-900/10 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-pink-100 dark:border-pink-800/20 shadow-sm dark:shadow-lg hover:border-pink-300 dark:hover:border-pink-500/30 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2.5 bg-pink-100 dark:bg-pink-500/10 rounded-xl border border-pink-200 dark:border-pink-500/20">
                    <PhotoIcon className="w-5 h-5 text-pink-500 dark:text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white text-sm font-semibold mb-1">
                      GPT Image 1.5
                    </h4>
                    <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                      Our most advanced model capable of generating legible text
                      and highly consistent characters.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-blue-900/10 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-blue-100 dark:border-blue-800/20 shadow-sm dark:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                    <CloudArrowDownIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white text-sm font-semibold mb-1">
                      Secure Storage
                    </h4>
                    <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                      Your images are stored securely in the cloud and available
                      for download anytime.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History Section */}
          <div className="relative z-0 mb-6">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-gray-800/50 pb-4">
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 dark:text-gray-500" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Recent Creations
              </h2>
            </div>

            {/* Loading Skeletons */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && imageFiles?.length === 0 && (
              <div className="text-center py-16 sm:py-24 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 dark:border-slate-800/50">
                <PhotoIcon className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4 opacity-50" />
                <p className="text-slate-500 dark:text-gray-500 text-sm sm:text-base">
                  No masterpieces yet. Start creating!
                </p>
              </div>
            )}

            {/* Image Grid */}
            {!isLoading && historyImages.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 pb-20">
                {historyImages.map((file) => (
                  <ImageCard
                    key={file.id}
                    file={file}
                    onDelete={promptDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Components

function ImageCard({
  file,
  isHighlighted = false,
  onDelete,
}: {
  file: ImageFile;
  isHighlighted?: boolean;
  onDelete: (id: string) => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDownloading) return;

    setIsDownloading(true);
    // Opens the asset in a tab if the storage host blocks the cross-origin read.
    await downloadFile(
      file.public_url,
      timestampedName(`generated-${file.model}`, file.created_at, "png"),
    );
    setIsDownloading(false);
  };

  return (
    // Card Background
    <div
      className={`group bg-white dark:bg-slate-900/50 backdrop-blur-sm border ${
        isHighlighted
          ? "border-emerald-200 dark:border-green-500/50 shadow-lg shadow-emerald-500/10 dark:shadow-green-900/20"
          : "border-slate-200 dark:border-slate-800/50 hover:border-blue-300 dark:hover:border-slate-700"
      } rounded-2xl transition-all shadow-sm dark:shadow-lg overflow-hidden flex flex-col`}
    >
      {/* Image Area */}
      <div className="relative aspect-square w-full bg-slate-100 dark:bg-black/50 overflow-hidden">
        <img
          src={file.public_url}
          alt={file.prompt}
          className="w-full h-full object-cover transition-opacity duration-700 hover:opacity-90"
          loading="lazy"
        />

        {/* Overlay Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10">
            {file.size}
          </span>
          <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10 uppercase">
            {file.quality}
          </span>
        </div>

        {/* Delete Button (Overlay) */}
        <button
          onClick={() => onDelete(file.id)}
          className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-red-500/80 text-gray-300 hover:text-white backdrop-blur-md rounded-lg border border-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Delete Image"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-medium text-pink-600 dark:text-pink-300 bg-pink-100 dark:bg-pink-500/10 px-2 py-1 rounded border border-pink-200 dark:border-pink-500/20 uppercase tracking-wide">
            {file.model}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">
            {new Date(file.created_at).toLocaleDateString()}
          </span>
        </div>

        <p className="text-slate-600 dark:text-gray-300 text-sm line-clamp-3 mb-4 leading-relaxed flex-1">
          {file.prompt}
        </p>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50 mt-auto">
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 text-xs font-medium bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-wait"
            disabled={isDownloading}
          >
            {isDownloading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <CloudArrowDownIcon className="w-4 h-4" />
            )}
            {isDownloading ? "Downloading..." : "Download Original"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900/30 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-2xl animate-pulse overflow-hidden">
      <div className="aspect-square bg-slate-200 dark:bg-slate-800/30"></div>
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800/50 rounded"></div>
          <div className="w-12 h-4 bg-slate-200 dark:bg-slate-800/50 rounded"></div>
        </div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-full"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-3/4"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-1/2"></div>
        <div className="pt-3 mt-2">
          <div className="w-full h-8 bg-slate-200 dark:bg-slate-800/50 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

// Reusable Config Selector
function ConfigSelector({
  label,
  icon,
  selected,
  onChange,
  options,
}: {
  label: string;
  icon: React.ReactNode;
  selected: ConfigOption;
  onChange: (o: ConfigOption) => void;
  options: ConfigOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        // Button Styles
        className="relative w-full cursor-pointer rounded-xl bg-slate-100 dark:bg-slate-950/50 py-2.5 pl-3 pr-8 text-left border border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-pink-500/50 transition-all text-xs sm:text-sm backdrop-blur-sm flex items-center gap-2"
      >
        <span className="text-slate-400 dark:text-gray-500">{icon}</span>
        <span className="block truncate text-slate-700 dark:text-gray-200 font-medium">
          {selected.name}
        </span>
        <span className="absolute right-3 top-3 text-slate-400 dark:text-gray-500 pointer-events-none">
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {isOpen && (
        // Dropdown Styles
        <div className="absolute bottom-full mb-2 w-full overflow-hidden rounded-xl bg-white dark:bg-[#0f1117] backdrop-blur-xl py-1 text-sm shadow-2xl border border-slate-200 dark:border-slate-700 z-[60] animate-in fade-in zoom-in-95 duration-200">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/50">
            Select {label}
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`w-full text-left relative cursor-pointer select-none py-2.5 pl-3 pr-4 transition-colors flex items-center justify-between ${
                  selected.id === option.id
                    ? "bg-pink-50 dark:bg-pink-600/20 text-pink-700 dark:text-pink-200"
                    : "text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                }`}
              >
                <span
                  className={`block truncate ${
                    selected.id === option.id ? "font-semibold" : "font-normal"
                  }`}
                >
                  {option.name}
                </span>
                {selected.id === option.id && (
                  <CheckIcon className="h-4 w-4 text-pink-500 dark:text-pink-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}