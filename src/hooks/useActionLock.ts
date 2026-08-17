import { useCallback, useRef, useState } from "react";

export function useActionLock() {
  const activeActionRef = useRef<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const runAction = useCallback(async <T,>(key: string, action: () => Promise<T>): Promise<T | undefined> => {
    if (activeActionRef.current) return undefined;
    activeActionRef.current = key;
    setActiveAction(key);
    try {
      return await action();
    } finally {
      activeActionRef.current = null;
      setActiveAction(null);
    }
  }, []);

  const isActionPending = useCallback((key?: string) => key ? activeAction === key : activeAction !== null, [activeAction]);

  return { activeAction, isActionPending, runAction };
}
