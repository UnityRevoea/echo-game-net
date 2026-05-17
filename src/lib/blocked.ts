import { useCallback, useEffect, useState } from "react";

const KEY = "ur_blocked_users";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("ur:blocked-changed"));
}

export function useBlockedUsers() {
  const [list, setList] = useState<string[]>(() => read());

  useEffect(() => {
    const handler = () => setList(read());
    window.addEventListener("ur:blocked-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("ur:blocked-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const block = useCallback((userId: string) => {
    const next = Array.from(new Set([...read(), userId]));
    write(next);
  }, []);
  const unblock = useCallback((userId: string) => {
    write(read().filter((id) => id !== userId));
  }, []);
  const isBlocked = useCallback((userId: string) => list.includes(userId), [list]);

  return { blocked: list, block, unblock, isBlocked };
}
