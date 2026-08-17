import { useCallback, useEffect, useRef, useState } from "react";

export type FormStatus = "initial" | "dirty" | "saving" | "saved";

function serialize(value: unknown) {
  return JSON.stringify(value);
}

export function useFormState<T>(value: T, isOpen: boolean, saving = false) {
  const initialValue = useRef(serialize(value));
  const wasOpen = useRef(false);
  const [saved, setSaved] = useState(false);

  if (isOpen && !wasOpen.current) initialValue.current = serialize(value);
  wasOpen.current = isOpen;

  const dirty = isOpen && serialize(value) !== initialValue.current;
  const status: FormStatus = saving ? "saving" : dirty ? "dirty" : saved ? "saved" : "initial";

  useEffect(() => {
    if (!isOpen) setSaved(false);
  }, [isOpen]);

  const markSaved = useCallback((nextValue: T) => {
    initialValue.current = serialize(nextValue);
    setSaved(true);
  }, []);

  return { dirty, markSaved, status };
}

export function useUnsavedChangesGuard({ busy = false, dirty, onClose }: { busy?: boolean; dirty: boolean; onClose: () => void }) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const requestClose = useCallback(() => {
    if (busy) return;
    if (dirty) setConfirmationOpen(true);
    else onClose();
  }, [busy, dirty, onClose]);
  const keepEditing = useCallback(() => setConfirmationOpen(false), []);
  const discardChanges = useCallback(() => {
    setConfirmationOpen(false);
    onClose();
  }, [onClose]);
  return { confirmationOpen, discardChanges, keepEditing, requestClose };
}

export function focusFirstInvalidField(fieldIds: string[]) {
  fieldIds.map((id) => document.getElementById(id)).find((field): field is HTMLElement => Boolean(field))?.focus();
}
