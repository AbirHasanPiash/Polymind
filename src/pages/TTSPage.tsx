import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import api, { fetcher, getErrorMessage } from "../api/client";
import {
  SpeakerWaveIcon,
  PlayCircleIcon,
  ArrowPathIcon,
  CloudArrowDownIcon,
  MicrophoneIcon,
  SparklesIcon,
  ChevronDownIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { useAwaitNewItem } from "../hooks/useAwaitNewItem";
import DeleteModal from "../components/DeleteModal";
import { downloadFile, timestampedName } from "../lib/download";

// Types
interface AudioFile {
  id: string;
  text_prompt: string;
  public_url: string;
  created_at: string;
  voice_name: string;
}

interface Voice {
  id: string;
  name: string;
}

// Available Voices Configuration
const AVAILABLE_VOICES: Voice[] = [
  { id: "en-US-Neural2-A", name: "Male (Calm)" },
  { id: "en-US-Neural2-C", name: "Female (Professional)" },
  { id: "en-US-Neural2-D", name: "Male (Deep)" },
  { id: "en-US-Neural2-E", name: "Female (Soft)" },
  { id: "en-US-Neural2-F", name: "Female (Energetic)" },
  { id: "en-US-Neural2-H", name: "Female (Bright)" },
  { id: "en-US-Neural2-I", name: "Male (Assertive)" },
  { id: "en-US-Neural2-J", name: "Male (Steady)" },
];

/** Generation is queued, so the audio row appears a few seconds later. */
const GENERATION_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 3000;
/** Google's per-request synthesis limit, mirrored from the backend. */
const MAX_TTS_CHARS = 4096;

export default function TTSPage() {
  const { refreshProfile } = useAuth();
  const toast = useToast();
  const [text, setText] = useState("");
  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[4]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: audioFiles,
    mutate,
    isLoading,
  } = useSWR<AudioFile[]>("/media/list", fetcher, {
    // Poll only while something is being generated. A constant refresh interval
    // keeps requesting for as long as the tab is open, for no benefit.
    refreshInterval: isGenerating ? POLL_INTERVAL_MS : 0,
  });

  // Watches the list for the row the worker will insert. Bound to the
  // component's lifetime, so navigating away cancels it cleanly.
  useAwaitNewItem<AudioFile>({
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

  const handleGenerate = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isGenerating) return;

    setLastGeneratedId(null);
    setIsGenerating(true);

    try {
      await api.post("/media/generate", { text: trimmed, voice_name: selectedVoice.id });
      // Credits are debited when the job is accepted, so refresh the balance now.
      void refreshProfile();
      void mutate();
    } catch (err) {
      setIsGenerating(false);
      toast.error(getErrorMessage(err, "Failed to generate audio"));
    }
  }, [text, isGenerating, selectedVoice.id, refreshProfile, mutate, toast]);

  // DELETE HANDLERS
  const promptDelete = (id: string) => {
    setItemToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);

    // Optimistic removal, rolled back if the request fails.
    const previousData = audioFiles;
    void mutate((currentData) => currentData?.filter((audio) => audio.id !== itemToDelete), false);

    try {
      await api.delete(`/media/audio/${itemToDelete}`);
      void mutate();
      setDeleteModalOpen(false);
      setItemToDelete(null);
      toast.success("Audio deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete audio"));
      void mutate(previousData, false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get last generated audio to show below generator
  const lastGeneratedAudio =
    lastGeneratedId && audioFiles
      ? audioFiles.find((f) => f.id === lastGeneratedId)
      : null;

  // Filter out the last generated from history if it exists
  const historyAudioFiles =
    audioFiles?.filter((f) => f.id !== lastGeneratedId) || [];

  return (
    <div className="flex flex-col h-full bg-blue-50 dark:bg-gradient-to-br dark:from-[#0a0b0f] dark:via-[#0d0e14] dark:to-[#0a0b0f] relative overflow-hidden transition-colors duration-300">
      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!isDeleting) setDeleteModalOpen(false);
        }}
        onConfirm={confirmDelete}
        title="Delete Audio"
        message="Are you sure you want to delete this audio file? This action cannot be undone."
        isDeleting={isDeleting}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 sm:mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-30 animate-pulse"></div>
                <SpeakerWaveIcon className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-500 relative z-10" />
              </div>
              <h1 className="text-2xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                Voice Studio
              </h1>
            </div>
            <p className="text-slate-500 dark:text-gray-400 text-sm sm:text-base ml-0 sm:ml-16">
              Transform text into lifelike speech with neural AI voices
            </p>
          </div>

          {/* Generator Section */}
          <div className="relative z-20 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-12">
            <div className="lg:col-span-2 space-y-6">
              {/* Text Input Card */}
              <div className="relative z-30">
                {/* Updated Card Background */}
                <div className="bg-white dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl transition-all">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <SparklesIcon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                        Input Text
                      </span>
                    </div>
                    {/* Textarea */}
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Enter your text here to convert into natural-sounding speech..."
                      className="w-full h-32 sm:h-40 bg-slate-50 dark:bg-slate-950/30 text-slate-900 dark:text-gray-100 p-4 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-slate-400 dark:placeholder-gray-600 text-base sm:text-lg border border-slate-200 dark:border-slate-800/50 transition-all custom-scrollbar"
                      maxLength={MAX_TTS_CHARS}
                    />
                  </div>

                  {/* Toolbar */}
                  <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20 rounded-b-2xl">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                      {/* Voice Selector */}
                      <div className="flex-1 max-w-full sm:max-w-xs z-50">
                        <VoiceSelector
                          selected={selectedVoice}
                          onChange={setSelectedVoice}
                          voices={AVAILABLE_VOICES}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <span className="text-xs text-slate-400 dark:text-gray-500 font-mono">
                          {text.length} / {MAX_TTS_CHARS}
                        </span>

                        <button
                          onClick={handleGenerate}
                          disabled={isGenerating || !text.trim()}
                          className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/25 ${
                            isGenerating || !text.trim()
                              ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90 active:scale-95"
                          }`}
                        >
                          {isGenerating ? (
                            <>
                              <ArrowPathIcon className="w-5 h-5 animate-spin" />
                              <span className="hidden sm:inline">
                                Generating...
                              </span>
                              <span className="sm:hidden">...</span>
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

              {/* Last Generated Audio */}
              {lastGeneratedAudio && !isGenerating && (
                <div className="relative z-10 animate-in fade-in slide-in-from-top-2 duration-500">
                  <div className="flex items-center gap-2 mb-3">
                    <SparklesIcon className="w-4 h-4 text-emerald-500 dark:text-green-400" />
                    <span className="text-xs font-medium text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      Just Generated
                    </span>
                  </div>
                  <AudioCard
                    file={lastGeneratedAudio}
                    isHighlighted
                    onDelete={promptDelete}
                  />
                </div>
              )}
            </div>

            {/* Feature Cards */}
            <div className="space-y-4 relative z-0">
              <div className="bg-white dark:bg-blue-900/10 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-blue-100 dark:border-blue-800/20 shadow-sm dark:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/30 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                    <MicrophoneIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white text-sm font-semibold mb-1">
                      Studio Quality
                    </h4>
                    <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                      Powered by Google's Neural2 engine for human-like
                      intonation and emotion.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-purple-900/10 backdrop-blur-sm p-5 sm:p-6 rounded-2xl border border-purple-100 dark:border-purple-800/20 shadow-sm dark:shadow-lg hover:border-purple-300 dark:hover:border-purple-500/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-500/10 rounded-xl border border-purple-200 dark:border-purple-500/20">
                    <CloudArrowDownIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-slate-900 dark:text-white text-sm font-semibold mb-1">
                      Instant Download
                    </h4>
                    <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                      High-quality MP3 files stored securely and ready for
                      immediate use.
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
                Recent Generations
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
            {!isLoading && audioFiles?.length === 0 && (
              <div className="text-center py-16 sm:py-24 bg-white/50 dark:bg-slate-900/30 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 dark:border-slate-800/50">
                <SpeakerWaveIcon className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4 opacity-50" />
                <p className="text-slate-500 dark:text-gray-500 text-sm sm:text-base">
                  No audio generated yet. Start creating!
                </p>
              </div>
            )}

            {/* Audio Files Grid */}
            {!isLoading && historyAudioFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 pb-20">
                {historyAudioFiles.map((file) => (
                  <AudioCard
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

// Audio Card Component
function AudioCard({
  file,
  isHighlighted = false,
  onDelete,
}: {
  file: AudioFile;
  isHighlighted?: boolean;
  onDelete: (id: string) => void;
}) {
  const voiceName =
    AVAILABLE_VOICES.find((v) => v.id === file.voice_name)?.name ||
    "Standard Voice";
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDownloading) return;

    setIsDownloading(true);
    // Falls back to opening a tab when the storage host blocks cross-origin reads.
    await downloadFile(file.public_url, timestampedName("generated-audio", file.created_at, "mp3"));
    setIsDownloading(false);
  };

  return (
    <div
      className={`group bg-white dark:bg-slate-900/50 backdrop-blur-sm border ${
        isHighlighted
          ? "border-emerald-200 dark:border-green-500/50 shadow-lg shadow-emerald-500/10 dark:shadow-green-900/20"
          : "border-slate-200 dark:border-slate-800/50 hover:border-blue-300 dark:hover:border-slate-700"
      } p-5 sm:p-6 rounded-2xl transition-all shadow-sm dark:shadow-lg hover:shadow-md hover:-translate-y-1 relative`}
    >
      {/* Delete Button (Top Right) */}
      <button
        onClick={() => onDelete(file.id)}
        className="absolute top-4 right-4 p-1.5 bg-slate-100 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-red-500/80 text-slate-400 dark:text-gray-400 hover:text-red-500 dark:hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
        title="Delete Audio"
      >
        <TrashIcon className="w-4 h-4" />
      </button>

      <div className="flex justify-between items-start mb-4 pr-8">
        <div className="flex items-center gap-2">
          <div
            className={`w-9 h-9 rounded-full ${
              isHighlighted
                ? "bg-gradient-to-br from-emerald-500 to-green-600"
                : "bg-gradient-to-br from-blue-500 to-purple-600"
            } flex items-center justify-center shadow-md`}
          >
            <SpeakerWaveIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-xs font-medium text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50">
            {voiceName}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-gray-600 font-mono bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded">
          {new Date(file.created_at).toLocaleDateString()}
        </span>
      </div>

      <p className="text-slate-600 dark:text-gray-300 text-sm line-clamp-2 mb-4 min-h-[2.5rem] italic leading-relaxed">
        "{file.text_prompt}"
      </p>

      {/* Audio Player Container */}
      <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-3 mb-4 border border-slate-200 dark:border-slate-800/40 shadow-inner group-hover:border-blue-200 dark:group-hover:border-slate-700/50 transition-colors">
        <audio
          controls
          src={file.public_url}
          className="w-full opacity-90 hover:opacity-100 transition-opacity"
          style={{ height: "32px" }}
        />
      </div>

      <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800/30">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="text-slate-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white transition-colors flex items-center gap-2 text-xs px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg font-medium disabled:opacity-50"
        >
          {isDownloading ? (
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
          ) : (
            <CloudArrowDownIcon className="w-4 h-4" />
          )}
          {isDownloading ? "Downloading..." : "Download MP3"}
        </button>
      </div>
    </div>
  );
}

// Skeleton Loader Component
function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900/30 backdrop-blur-sm border border-slate-200 dark:border-slate-800/50 p-5 sm:p-6 rounded-2xl animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800/50"></div>
          <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800/50 rounded-full"></div>
        </div>
        <div className="w-16 h-5 bg-slate-200 dark:bg-slate-800/50 rounded"></div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-full"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-800/50 rounded w-3/4"></div>
      </div>

      <div className="bg-slate-50 dark:bg-black/40 rounded-xl p-3 mb-4 border border-slate-200 dark:border-slate-800/40">
        <div className="h-8 bg-slate-200 dark:bg-slate-800/50 rounded"></div>
      </div>

      <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800/30">
        <div className="w-28 h-8 bg-slate-200 dark:bg-slate-800/50 rounded-lg"></div>
      </div>
    </div>
  );
}

// Voice Selector Component
function VoiceSelector({
  selected,
  onChange,
  voices,
}: {
  selected: Voice;
  onChange: (v: Voice) => void;
  voices: Voice[];
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
        className="relative w-full cursor-pointer rounded-xl bg-slate-100 dark:bg-slate-950/50 py-2.5 pl-4 pr-10 text-left border border-slate-200 dark:border-slate-700/50 hover:border-blue-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm backdrop-blur-sm flex justify-between items-center"
      >
        <span className="block truncate text-slate-700 dark:text-gray-200">
          <span className="text-slate-400 dark:text-gray-500 mr-2">Voice:</span>
          <span className="font-medium">{selected.name}</span>
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-slate-400 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          className="
      absolute
      z-[999]
      w-full
      max-h-60
      overflow-y-auto
[&::-webkit-scrollbar]:hidden
[-ms-overflow-style:'none']
[scrollbar-width:'none']
      rounded-xl
      bg-white
      dark:bg-[#0f1117]
      backdrop-blur-xl
      py-1
      text-sm
      shadow-2xl
      border
      border-slate-200
      dark:border-slate-700
      animate-in
      fade-in
      zoom-in-95
      duration-200

      /* Mobile: open upward */
      bottom-full
      mb-2
      origin-bottom

      /* Desktop: open downward */
      sm:top-full
      sm:bottom-auto
      sm:mt-2
      sm:mb-0
      sm:origin-top
    "
        >
          {voices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => {
                onChange(voice);
                setIsOpen(false);
              }}
              className={`w-full text-left relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors ${
                selected.id === voice.id
                  ? "bg-blue-50 dark:bg-blue-600/20 text-blue-700 dark:text-blue-200"
                  : "text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
              }`}
            >
              <span
                className={`block truncate ${
                  selected.id === voice.id
                    ? "font-semibold text-blue-800 dark:text-white"
                    : "font-normal"
                }`}
              >
                <span className="text-slate-400 dark:text-gray-500 mr-2">
                  {voice.name}
                </span>
              </span>
              {selected.id === voice.id && (
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-500 dark:text-blue-400">
                  <CheckIcon className="h-5 w-5" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
