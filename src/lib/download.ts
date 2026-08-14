/**
 * Save a remote asset to disk.
 *
 * Fetching into a blob is what makes the browser save the file instead of
 * navigating to it. If the object storage host does not allow the cross-origin
 * read, this falls back to opening the URL in a new tab rather than failing —
 * the user still gets their file.
 *
 * Shared by the audio, image and video pages, which each had their own copy.
 */
export async function downloadFile(
  url: string,
  filename: string,
): Promise<"downloaded" | "opened"> {
  try {
    const response = await fetch(url, { mode: "cors", cache: "no-cache" });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Revoke on the next tick: revoking synchronously can cancel the download
    // in some browsers before it has started reading the blob.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return "downloaded";
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    return "opened";
  }
}

/** `generated-audio-2026-08-14.mp3` */
export function timestampedName(prefix: string, isoDate: string | undefined, extension: string) {
  const date = (isoDate ?? new Date().toISOString()).split("T")[0];
  return `${prefix}-${date}.${extension}`;
}
