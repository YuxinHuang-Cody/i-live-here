export type PinKind = 'doing' | 'wishlist';

export const ANONYMOUS_AUTHOR = '栖居者';

export interface PinDraft {
  kind: PinKind;
  title: string;
  note: string;
  lng: number;
  lat: number;
  author: string;
  /** base64 data URL for now; future backend will return a hosted URL instead. */
  imageDataUrl?: string;
}

export interface Pin extends PinDraft {
  id: string;
  createdAt: number;
  likes: number;
}
