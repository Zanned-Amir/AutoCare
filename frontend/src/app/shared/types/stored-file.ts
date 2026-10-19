/** Mirrors the backend StoredFileDto. `url` is signed and expires after a few minutes. */
export interface StoredFile {
  id: number;
  ownerType: string;
  ownerId: number;
  purpose: 'AVATAR' | 'LOGO' | 'PHOTO' | 'DOCUMENT';
  originalName: string;
  contentType: string;
  sizeBytes: number;
  position: number;
  url: string;
}
