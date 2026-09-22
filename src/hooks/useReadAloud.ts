import { useCallback, useEffect, useRef, useState } from "react";

import api, { getErrorMessage } from "../api/client";
import type { GeneratedAudio } from "../api/types";
import { useToast } from "../context/toast-context";

const POLL_MS = 2500;
const MAX_WAIT_MS = 90_000;

/**
 * "Read aloud" for an assistant message: asks the API to synthesise it, waits
 * for the worker to store the audio, then plays it. One player at a time.
 */
export function useReadAloud() {
  const toast = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelled = useRef(false);

  const stop = useCallback(() => {
    cancelled.current = true;
    audioRef.current?.pause();
    audioRef.current = null;
    setActiveId(null);
    setState("idle");
  }, []);

  useEffect(() => stop, [stop]);

  const play = useCallback(
    async (messageId: string) => {
      if (activeId === messageId) {
        stop();
        return;
      }
      stop();
      cancelled.current = false;
      setActiveId(messageId);
      setState("loading");

      try {
        const { data } = await api.post<{ status: string; audio_url?: string }>(`/media/tts/${messageId}`);
        let url = data.audio_url ?? null;
        const started = Date.now();
        while (!url && !cancelled.current && Date.now() - started < MAX_WAIT_MS) {
          await new Promise((resolve) => setTimeout(resolve, POLL_MS));
          const { data: audio } = await api.get<GeneratedAudio | null>(`/media/tts/${messageId}`);
          if (audio?.public_url) url = audio.public_url;
        }
        if (cancelled.current) return;
        if (!url) throw new Error("Audio is taking longer than expected. Try again in a moment.");

        const player = new Audio(url);
        audioRef.current = player;
        player.onended = () => {
          setActiveId(null);
          setState("idle");
        };
        await player.play();
        setState("playing");
      } catch (error) {
        if (!cancelled.current) {
          toast.error(getErrorMessage(error, "Could not read this message aloud"));
          setActiveId(null);
          setState("idle");
        }
      }
    },
    [activeId, stop, toast],
  );

  return { play, stop, activeId, state };
}
