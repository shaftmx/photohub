/**
 * Returns the thumbnail filename for a photo or video.
 * Videos are stored as .mp4 but their sample is a JPEG — this normalizes both.
 */
export function thumbFilename(photo) {
  return photo.filename.replace(/\.[^.]+$/, '.jpg')
}
