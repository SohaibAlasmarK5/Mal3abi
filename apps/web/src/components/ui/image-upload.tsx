"use client";
// ICU number arguments would use Arabic-Indic digits, so numbers are passed as strings.

import { ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

type Item = { file: File; url: string };

type Props = {
  /** Called with the current list of files after every change. Uploading happens elsewhere. */
  onFilesChange?: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
  className?: string;
};

/** Pick or drop court photos, with previews. JPG, PNG or WebP; the server converts to WebP. */
export function ImageUpload({ onFilesChange, maxFiles = 10, maxSizeMb = 5, className }: Props) {
  const t = useTranslations("imageUpload");
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Free the preview URLs when the component goes away.
  useEffect(() => () => itemsRef.current.forEach((item) => URL.revokeObjectURL(item.url)), []);

  function update(next: Item[]) {
    setItems(next);
    onFilesChange?.(next.map((item) => item.file));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const added: Item[] = [];
    for (const file of Array.from(list)) {
      if (!acceptedTypes.includes(file.type)) {
        setError(t("errorType"));
        continue;
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(t("errorSize", { max: String(maxSizeMb) }));
        continue;
      }
      if (items.length + added.length >= maxFiles) {
        setError(t("errorCount", { max: String(maxFiles) }));
        break;
      }
      added.push({ file, url: URL.createObjectURL(file) });
    }
    if (added.length) update([...items, ...added]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(index: number) {
    const item = items[index];
    if (item) URL.revokeObjectURL(item.url);
    update(items.filter((_, i) => i !== index));
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "rounded-card border-line bg-surface hover:bg-accent-soft flex cursor-pointer flex-col items-center gap-2 border border-dashed p-6 text-center",
          dragging && "border-accent bg-accent-soft",
        )}
      >
        <ImagePlus className="text-muted size-7" aria-hidden />
        <span className="font-medium">{t("prompt")}</span>
        <span className="text-muted text-sm">{t("hint", { max: String(maxSizeMb) })}</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={acceptedTypes.join(",")}
          multiple
          className="sr-only"
          onChange={(event) => addFiles(event.target.files)}
        />
      </label>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      {items.length ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((item, index) => (
            <li
              key={item.url}
              className="rounded-control border-line relative aspect-square overflow-hidden border"
            >
              {/* Local previews (blob URLs) cannot go through next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={t("previewAlt", { index: String(index + 1) })}
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={t("remove", { index: String(index + 1) })}
                className="size-control border-line bg-surface absolute end-1 top-1 inline-flex items-center justify-center rounded-full border"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="text-muted text-sm">
        {t("count", { count: String(items.length), max: String(maxFiles) })}
      </p>
    </div>
  );
}
