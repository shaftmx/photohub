/**
 * Returns the thumbnail filename for a photo or video.
 * Videos are stored as .mp4 but their sample is a JPEG — this normalizes both.
 */
export function thumbFilename(photo) {
  return photo.filename.replace(/\.[^.]+$/, '.jpg')
}

export function formatDuration(seconds) {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
