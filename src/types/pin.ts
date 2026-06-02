export type PinKind = 'doing' | 'wishlist';

export const ANONYMOUS_AUTHOR = '栖居者';

interface PinFields {
  kind: PinKind;
  title: string;
  note: string;
  lng: number;
  lat: number;
  author: string;
}

/** Input shape from the form to the service. Image arrives as a Blob; the
 *  service decides whether to inline it (localStorage) or upload it (Supabase). */
export interface PinDraft extends PinFields {
  imageBlob?: Blob;
}

/** Output shape exposed to the UI. `imageUrl` may be a remote URL or a data: URL. */
export interface Pin extends PinFields {
  id: string;
  createdAt: number;
  likes: number;
  imageUrl?: string;
}
