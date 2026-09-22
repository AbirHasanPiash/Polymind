import { useCallback } from "react";
import useSWR, { mutate as globalMutate } from "swr";

import api, { fetcher } from "../api/client";
import type { ChatSummary } from "../api/types";

export const CHAT_LIST_KEY = "/chat/list?limit=100";

/** The sidebar's conversation list, with optimistic edits. */
export function useChats() {
  const { data, error, isLoading, mutate } = useSWR<ChatSummary[]>(CHAT_LIST_KEY, fetcher, {
    revalidateOnFocus: true,
  });

  const rename = useCallback(
    async (id: string, title: string) => {
      await mutate(
        async (current) => {
          const { data: updated } = await api.patch<ChatSummary>(`/chat/${id}`, { title });
          return (current ?? []).map((chat) => (chat.id === id ? { ...chat, ...updated } : chat));
        },
        {
          optimisticData: (current) =>
            (current ?? []).map((chat) => (chat.id === id ? { ...chat, title } : chat)),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [mutate],
  );

  const setPinned = useCallback(
    async (id: string, pinned: boolean) => {
      await mutate(
        async (current) => {
          await api.patch(`/chat/${id}`, { pinned });
          return sortChats((current ?? []).map((chat) => (chat.id === id ? { ...chat, pinned } : chat)));
        },
        {
          optimisticData: (current) =>
            sortChats((current ?? []).map((chat) => (chat.id === id ? { ...chat, pinned } : chat))),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [mutate],
  );

  const remove = useCallback(
    async (id: string) => {
      await mutate(
        async (current) => {
          await api.delete(`/chat/${id}`);
          return (current ?? []).filter((chat) => chat.id !== id);
        },
        {
          optimisticData: (current) => (current ?? []).filter((chat) => chat.id !== id),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    },
    [mutate],
  );

  return { chats: data ?? [], error, isLoading, mutate, rename, setPinned, remove };
}

export function sortChats(chats: ChatSummary[]): ChatSummary[] {
  return [...chats].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ta = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return tb - ta;
  });
}

/** Refresh the list from anywhere (after a new chat is created, for example). */
export function refreshChats() {
  return globalMutate(CHAT_LIST_KEY);
}
