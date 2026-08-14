import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useSWR from "swr";
import api, { fetcher, getErrorMessage } from "../api/client";
import {
  UserCircleIcon,
  VideoCameraIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  SparklesIcon,
  ChevronDownIcon,
  CheckIcon,
  ClockIcon,
  MicrophoneIcon,
  LinkIcon,
  PhotoIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  Square2StackIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useAwaitNewItem } from "../hooks/useAwaitNewItem";
import { downloadFile, timestampedName } from "../lib/download";
import { MAX_FILE_SIZE_BYTES, UPLOAD_LIMITS } from "../lib/env";
import DeleteModal from "../components/DeleteModal";

// Types
interface AvatarVideo {
  id: string;
  public_url: string | null;
  thumbnail_url: string | null;
  status: "processing" | "processing_external" | "completed" | "failed";
  /** The narration script. The API field is script_text; the old `text_prompt`
   *  did not exist on the model, so this always rendered empty. */
  script_text: string;
  error_message?: string | null;
  created_at: string;
  avatar_image_url: string;
}

// Added Image Type for History Selection
interface GeneratedImage {
  id: string;
  public_url: string;
  prompt: string;
  created_at: string;
}

interface ConfigOption {
  id: string;
  name: string;
  value: string;
}

interface PresetCharacter {
  id: string;
  url: string;
  name: string;
}

// Configuration
const VOICES: ConfigOption[] = [
  {
    id: "en-US-Neural2-F",
    name: "Female (Energetic)",
    value: "en-US-Neural2-F",
  },
  { id: "en-US-Neural2-A", name: "Male (Calm)", value: "en-US-Neural2-A" },
  {
    id: "en-US-Neural2-C",
    name: "Female (Professional)",
    value: "en-US-Neural2-C",
  },
  { id: "en-US-Neural2-J", name: "Male (Steady)", value: "en-US-Neural2-J" },
];

const PRESETS: PresetCharacter[] = [
  {
    id: "p1",
    name: "Emma",
    url: "https://pub-f05b7ab0255f4775b9b9ca5637a40853.r2.dev/presets/emma.png",
  },
  {
    id: "p2",
    name: "James",
    url: "https://pub-f05b7ab0255f4775b9b9ca5637a40853.r2.dev/presets/james.png",
  },
  {
    id: "p3",
    name: "Sarah",
    url: "https://pub-f05b7ab0255f4775b9b9ca5637a40853.r2.dev/presets/sarah.png",
  },
  {
    id: "p4",
    name: "Michael",
    url: "https://pub-f05b7ab0255f4775b9b9ca5637a40853.r2.dev/presets/michael.png",
  },
];

/** D-ID renders take minutes; the row appears immediately with a pending status. */
const SUBMIT_TIMEOUT_MS = 60_000;
const ACTIVE_POLL_MS = 5000;

export default function AvatarPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Avatar Selection
  const [activeTab, setActiveTab] = useState<"preset" | "generate" | "custom">(
    "preset"
  );
  const [selectedPreset, setSelectedPreset] = useState<PresetCharacter>(
    PRESETS[0]
  );

  // Custom Upload State
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [customPreview, setCustomPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation (Library Selection)
  const [generatedFaceUrl, setGeneratedFaceUrl] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  // Script & Animation
  const [script, setScript] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastVideoId, setLastVideoId] = useState<string | null>(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Data
  const {
    data: videos,
    mutate,
    isLoading,
  } = useSWR<AvatarVideo[]>("/media/videos/list", fetcher, {
    // Poll only while a render is in progress. The previous fixed interval kept
    // hitting the API every five seconds for as long as the tab stayed open.
    refreshInterval: (latest) =>
      isAnimating || latest?.some((video) => video.status.startsWith("processing"))
        ? ACTIVE_POLL_MS
        : 0,
  });
  // Fetch Image History for the Library
  const { data: imageLibrary } = useSWR<GeneratedImage[]>(
    "/media/images/list?limit=20",
    fetcher
  );

  // Helpers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`Avatar image must be under ${UPLOAD_LIMITS.maxFileSizeMb} MB`);
        return;
      }
      setCustomFile(file);
      setCustomPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return URL.createObjectURL(file);
      });
      setCustomAvatarUrl("");
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomFile(null);
    setCustomPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Release the preview blob when leaving the page.
  useEffect(
    () => () =>
      setCustomPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      }),
    [],
  );

  useAwaitNewItem<AvatarVideo>({
    items: videos,
    isWaiting: isAnimating,
    timeoutMs: SUBMIT_TIMEOUT_MS,
    onArrived: (video) => {
      setLastVideoId(video.id);
      setScript("");
      setIsAnimating(false);
      void refreshProfile();
      toast.success("Rendering started — your video will appear below when it is ready");
    },
    onTimeout: () => {
      setIsAnimating(false);
      toast.error("Still processing in the background. Check your history shortly.");
    },
  });

  // Handle Video Animation (D-ID)
  const handleAnimate = useCallback(async () => {
    if (isAnimating) return;

    if (!script.trim()) {
      toast.error("Enter a script for your avatar to read");
      return;
    }

    setIsAnimating(true);

    try {
      // Resolve the avatar image for the selected tab.
      let sourceUrl = "";
      if (activeTab === "preset") {
        sourceUrl = selectedPreset.url;
      } else if (activeTab === "generate") {
        sourceUrl = generatedFaceUrl ?? "";
      } else if (customFile) {
        const formData = new FormData();
        formData.append("file", customFile);
        const uploadRes = await api.post<{ public_url: string }>("/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        sourceUrl = uploadRes.data.public_url;
      } else {
        sourceUrl = customAvatarUrl;
      }

      if (!sourceUrl) {
        setIsAnimating(false);
        toast.error("Choose an avatar image first");
        return;
      }

      setLastVideoId(null);

      // The backend derives provider and model itself; sending them was noise.
      await api.post("/media/generate-avatar", {
        text: script,
        voice_name: selectedVoice.value,
        avatar_url: sourceUrl,
      });

      // Credits are reserved when the job is accepted.
      void refreshProfile();
      void mutate();
    } catch (err) {
      setIsAnimating(false);
      toast.error(getErrorMessage(err, "Failed to start the avatar render"));
    }
  }, [
    activeTab,
    customAvatarUrl,
    customFile,
    generatedFaceUrl,
    isAnimating,
    mutate,
    refreshProfile,
    script,
    selectedPreset.url,
    selectedVoice.value,
    toast,
  ]);

  // DELETE HANDLERS
  const promptDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    // OPTIMISTIC UPDATE
    const previousData = videos;
    mutate(
      (currentData) => currentData?.filter((vid) => vid.id !== itemToDelete),
      false
    );

    try {
      await api.delete(`/media/videos/${itemToDelete}`);
      void mutate();
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success("Video deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete video"));
      void mutate(previousData, false);
    } finally {
      setIsDeleting(false);
    }
  };

  const lastGeneratedVideo =
    lastVideoId && videos ? videos.find((v) => v.id === lastVideoId) : null;
  const historyVideos = videos?.filter((v) => v.id !== lastVideoId) || [];

  return (
    <div className="flex flex-col h-full bg-blue-50 dark:bg-gradient-to-br dark:from-[#0a0b0f] dark:via-[#0d0e14] dark:to-[#0a0b0f] relative overflow-hidden transition-colors duration-300">
      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) setDeleteModalOpen(false);
        }}
        onConfirm={confirmDelete}
        title="Delete Video"
        message="Are you sure you want to delete this video? This action cannot be undone."
        isDeleting={isDeleting}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-30 animate-pulse"></div>
                <UserCircleIcon className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 dark:text-purple-500 relative z-10" />
              </div>
              <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Avatar Studio
              </h1>
            </div>
            <p className="text-slate-500 dark:text-gray-400 text-sm sm:text-base ml-0 sm:ml-16">
              Create lifelike talking avatars from text scripts
            </p>
          </div>

          <div className="relative z-20 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
            {/* LEFT COLUMN: Controls */}
            <div className="lg:col-span-2 space-y-6">
              {/* MAIN INPUT CARD */}
              <div className="relative z-30">
                {/* Card Background */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-all overflow-hidden">
                  {/* TABS HEADER */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-950/30">
                    <button
                      onClick={() => setActiveTab("preset")}
                      className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
                        activeTab === "preset"
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"
                      }`}
                    >
                      Preset Actors
                      {activeTab === "preset" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("generate")}
                      className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
                        activeTab === "generate"
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"
                      }`}
                    >
                      Create / Select from Library
                      {activeTab === "generate" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab("custom")}
                      className={`flex-1 py-4 text-sm font-medium transition-colors relative ${
                        activeTab === "custom"
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-500 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300"
                      }`}
                    >
                      Upload / URL
                      {activeTab === "custom" && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                      )}
                    </button>
                  </div>

                  <div className="p-4 sm:p-6">
                    {/* TAB CONTENT: PRESETS */}
                    {activeTab === "preset" && (
                      <div className="animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <SparklesIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                          <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                            Select Actor
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {PRESETS.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => setSelectedPreset(p)}
                              className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                selectedPreset.id === p.id
                                  ? "border-purple-500 shadow-lg shadow-purple-500/20 scale-[1.02]"
                                  : "border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                              }`}
                            >
                              <img
                                src={p.url}
                                alt={p.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-white text-xs font-medium text-center">
                                  {p.name}
                                </p>
                              </div>
                              {selectedPreset.id === p.id && (
                                <div className="absolute top-2 right-2 bg-purple-500 rounded-full p-1">
                                  <CheckIcon className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB CONTENT: LIBRARY (REPLACED GENERATE) */}
                    {activeTab === "generate" && (
                      <div className="animate-in fade-in duration-300 space-y-6">
                        {/* Actions Area */}
                        <div className="flex gap-4">
                          <button
                            onClick={() => navigate("/dashboard/images")}
                            className="flex-1 flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500/50 bg-slate-50 dark:bg-slate-900/50 hover:bg-purple-50 dark:hover:bg-slate-900/50 transition-all group"
                          >
                            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                              <SparklesIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-slate-900 dark:text-white font-medium text-sm">
                                Create New Actor
                              </p>
                              <p className="text-slate-500 dark:text-gray-500 text-xs mt-1">
                                Go to Image Studio
                              </p>
                            </div>
                          </button>

                          <button
                            onClick={() => setIsLibraryOpen(!isLibraryOpen)}
                            className={`flex-1 flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 transition-all group ${
                              isLibraryOpen
                                ? "border-blue-400 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-900/10"
                                : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/50 bg-slate-50 dark:bg-slate-900/50"
                            }`}
                          >
                            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                              <Square2StackIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-slate-900 dark:text-white font-medium text-sm">
                                Select from Library
                              </p>
                              <p className="text-slate-500 dark:text-gray-500 text-xs mt-1">
                                Use generated images
                              </p>
                            </div>
                          </button>
                        </div>

                        {/* Selected Image Preview (If any) */}
                        {generatedFaceUrl && !isLibraryOpen && (
                          <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 border border-purple-200 dark:border-purple-500/30 rounded-xl shadow-sm dark:shadow-lg shadow-purple-900/10 animate-in fade-in slide-in-from-top-2">
                            <img
                              src={generatedFaceUrl}
                              className="w-16 h-16 rounded-lg object-cover border border-slate-300 dark:border-slate-700"
                              alt="Selected"
                            />
                            <div className="flex-1">
                              <p className="text-slate-900 dark:text-white text-sm font-medium">
                                Actor Selected
                              </p>
                              <p className="text-slate-500 dark:text-gray-400 text-xs">
                                Ready to animate this character.
                              </p>
                            </div>
                            <button
                              onClick={() => setIsLibraryOpen(true)}
                              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
                            >
                              Change
                            </button>
                          </div>
                        )}

                        {/* Image Grid */}
                        {isLibraryOpen && (
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                                Your Generated Images
                              </span>
                            </div>

                            {imageLibrary && imageLibrary.length > 0 ? (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-60 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                                {imageLibrary.map((img) => (
                                  <button
                                    key={img.id}
                                    onClick={() => {
                                      setGeneratedFaceUrl(img.public_url);
                                      setIsLibraryOpen(false);
                                    }}
                                    className={`group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                      generatedFaceUrl === img.public_url
                                        ? "border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                        : "border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
                                    }`}
                                  >
                                    <img
                                      src={img.public_url}
                                      alt={img.prompt}
                                      className="w-full h-full object-cover"
                                    />
                                    {generatedFaceUrl === img.public_url && (
                                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                        <div className="bg-green-500 rounded-full p-1">
                                          <CheckIcon className="w-3 h-3 text-white" />
                                        </div>
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-slate-500 dark:text-gray-500 text-sm bg-slate-50 dark:bg-slate-950/30 rounded-xl">
                                No generated images found.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB CONTENT: CUSTOM UPLOAD */}
                    {activeTab === "custom" && (
                      <div className="animate-in fade-in duration-300">
                        <div className="flex items-center gap-2 mb-3">
                          <ArrowUpTrayIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                          <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                            Upload Character
                          </span>
                        </div>

                        {!customPreview ? (
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500/50 rounded-xl bg-slate-50 dark:bg-slate-950/30 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-900/50 mb-4"
                          >
                            <CloudArrowDownIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 mb-2" />
                            <p className="text-slate-600 dark:text-gray-400 text-sm font-medium">
                              Click to upload image
                            </p>
                            <p className="text-slate-400 dark:text-gray-600 text-xs">
                              JPG, PNG up to 10MB
                            </p>
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              className="hidden"
                              accept="image/png, image/jpeg"
                            />
                          </div>
                        ) : (
                          <div className="relative w-full h-40 bg-slate-50 dark:bg-slate-950/30 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center mb-4 group">
                            <img
                              src={customPreview}
                              alt="Preview"
                              className="h-full object-contain"
                            />
                            <button
                              onClick={clearFile}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 p-1.5 rounded-full text-white transition-colors"
                            >
                              <XMarkIcon className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
                              {customFile?.name}
                            </div>
                          </div>
                        )}

                        {/* Fallback URL Input */}
                        {!customFile && (
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <LinkIcon className="h-4 w-4 text-slate-400 dark:text-gray-500" />
                            </div>
                            <input
                              type="text"
                              value={customAvatarUrl}
                              onChange={(e) =>
                                setCustomAvatarUrl(e.target.value)
                              }
                              placeholder="Or paste an image URL..."
                              className="w-full bg-slate-50 dark:bg-slate-950/30 text-slate-900 dark:text-gray-100 pl-9 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500/50 border border-slate-200 dark:border-slate-800/50 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* SCRIPT SECTION */}
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/50">
                      <div className="flex items-center gap-2 mb-3">
                        <MicrophoneIcon className="w-4 h-4 text-emerald-500 dark:text-green-400" />
                        <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                          Script
                        </span>
                      </div>
                      {/* Textarea */}
                      <textarea
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="What should the avatar say? Enter your script here..."
                        className="w-full h-24 bg-slate-50 dark:bg-slate-950/30 text-slate-900 dark:text-gray-100 p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-slate-400 dark:placeholder-gray-600 text-base border border-slate-200 dark:border-slate-800/50 transition-all"
                        maxLength={500}
                      />
                    </div>
                  </div>

                  {/* Footer Toolbar */}
                  <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20 rounded-b-2xl">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                      <div className="w-full sm:w-1/2">
                        <ConfigSelector
                          label="Voice"
                          icon={<CloudArrowDownIcon className="w-4 h-4" />}
                          selected={selectedVoice}
                          onChange={setSelectedVoice}
                          options={VOICES}
                        />
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <span className="text-xs text-slate-400 dark:text-gray-500 font-mono hidden sm:inline-block">
                          {script.length} / 500 chars
                        </span>
                        <button
                          onClick={handleAnimate}
                          disabled={isAnimating || !script.trim()}
                          className={`flex-1 sm:flex-none relative flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-purple-500/25 ${
                            isAnimating || !script.trim()
                              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:opacity-90 active:scale-95"
                          }`}
                        >
                          {isAnimating ? (
                            <>
                              <ArrowPathIcon className="w-5 h-5 animate-spin" />
                              <span>Animating...</span>
                            </>
                          ) : (
                            <>
                              <VideoCameraIcon className="w-5 h-5" />
                              Generate Video
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero Result (Last Generated) */}
              {lastGeneratedVideo && !isAnimating && (
                <div className="relative z-10 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-2 mb-3">
                    <SparklesIcon className="w-4 h-4 text-emerald-500 dark:text-green-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      Just Created
                    </span>
                  </div>
                  <VideoCard
                    video={lastGeneratedVideo}
                    isHighlighted
                    onDelete={promptDelete}
                  />
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Info Sidebar */}
            <div className="space-y-4 relative z-0">
              <div className="bg-white dark:bg-purple-900/10 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-purple-100 dark:border-purple-800/20 shadow-sm dark:shadow-lg hover:border-purple-300 dark:hover:border-purple-500/30 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20">
                    <UserCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white text-sm font-semibold mb-1">
                      D-ID Avatar
                    </h4>
                    <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                      Powered by D-ID's Talk engine. Generate realistic head
                      movements and lip-syncing from any image.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-blue-900/10 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-blue-100 dark:border-blue-800/20 shadow-sm dark:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                    <PhotoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white text-sm font-semibold mb-1">
                      Create Character
                    </h4>
                    <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                      Use the "Generate New" tab to create a unique 8k portrait
                      using DALL-E 3, then animate it instantly.
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
                Recent Videos
              </h2>
            </div>

            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            )}

            {!isLoading && videos?.length === 0 && (
              <div className="text-center py-16 sm:py-24 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 dark:border-slate-800/50">
                <VideoCameraIcon className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4 opacity-50" />
                <p className="text-slate-500 dark:text-gray-500 text-sm sm:text-base">
                  No videos yet. Create your first avatar!
                </p>
              </div>
            )}

            {!isLoading && historyVideos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 pb-20">
                {historyVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
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

// SUB-COMPONENTS

function VideoCard({
  video,
  isHighlighted = false,
  onDelete,
}: {
  video: AvatarVideo;
  isHighlighted?: boolean;
  onDelete: (id: string) => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloading || !video.public_url) return;

    setIsDownloading(true);
    await downloadFile(
      video.public_url,
      timestampedName("generated-avatar", video.created_at, "mp4"),
    );
    setIsDownloading(false);
  };
  const isLoading =
    video.status === "processing" || video.status === "processing_external";

  return (
    // Card Background
    <div
      className={`group bg-white dark:bg-slate-900/50 backdrop-blur-sm border ${
        isHighlighted
          ? "border-emerald-200 dark:border-green-500/50 shadow-lg shadow-emerald-500/10 dark:shadow-green-900/20"
          : "border-slate-200 dark:border-slate-800/50 hover:border-blue-300 dark:hover:border-slate-700"
      } rounded-2xl transition-all shadow-sm dark:shadow-lg overflow-hidden flex flex-col relative`}
    >
      {/* Delete Button (Overlay) */}
      <button
        onClick={() => onDelete(video.id)}
        className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-red-500/80 text-gray-300 hover:text-white backdrop-blur-md rounded-lg border border-white/10 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        title="Delete Video"
      >
        <TrashIcon className="w-4 h-4" />
      </button>

      {/* Video Area */}
      <div className="relative aspect-video w-full bg-slate-100 dark:bg-black/50 overflow-hidden group">
        {video.status === "completed" && video.public_url ? (
          <video
            src={video.public_url}
            controls
            className="w-full h-full object-cover"
            poster={video.thumbnail_url || video.avatar_image_url}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-8 h-8 text-purple-600 dark:text-purple-500 animate-spin" />
                <span className="text-xs text-purple-700 dark:text-purple-300 font-medium animate-pulse">
                  {video.status === "processing_external"
                    ? "Rendering with AI..."
                    : "Preparing Assets..."}
                </span>
              </>
            ) : (
              <span className="text-red-500 font-medium">
                Generation Failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-3">
          <span className="text-[10px] font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-500/10 px-2 py-1 rounded border border-purple-200 dark:border-purple-500/20 uppercase tracking-wide">
            D-ID
          </span>
          <span className="text-[10px] text-slate-500 dark:text-gray-500 font-mono">
            {new Date(video.created_at).toLocaleDateString()}
          </span>
        </div>

        <p className="text-slate-600 dark:text-gray-300 text-sm line-clamp-3 mb-4 leading-relaxed flex-1 italic">
          "{video.script_text}"
        </p>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/50 mt-auto">
          <button
            onClick={handleDownload}
            disabled={video.status !== "completed" || isDownloading}
            className={`w-full flex items-center justify-center gap-2 text-xs font-medium py-2.5 rounded-xl transition-colors ${
              video.status === "completed"
                ? "bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white"
                : "bg-slate-100 dark:bg-slate-800/20 text-slate-400 dark:text-gray-600 cursor-not-allowed"
            }`}
          >
            {isDownloading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <CloudArrowDownIcon className="w-4 h-4" />
            )}
            {isDownloading ? "Downloading..." : "Download Video"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900/30 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 rounded-2xl animate-pulse overflow-hidden">
      <div className="aspect-video bg-slate-200 dark:bg-slate-800/30"></div>
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800/50 rounded"></div>
          <div className="w-12 h-4 bg-slate-200 dark:bg-slate-800/50 rounded"></div>
        </div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-full"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-3/4"></div>
        <div className="pt-3 mt-2">
          <div className="w-full h-8 bg-slate-200 dark:bg-slate-800/50 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

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
        className="relative w-full cursor-pointer rounded-xl bg-slate-100 dark:bg-slate-950/50 py-2.5 pl-3 pr-8 text-left border border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all text-xs sm:text-sm backdrop-blur-sm flex items-center gap-2"
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
                    ? "bg-purple-50 dark:bg-purple-600/20 text-purple-700 dark:text-purple-200"
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
                  <CheckIcon className="h-4 w-4 text-purple-500 dark:text-purple-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}