export type PinKind = 'doing' | 'wishlist';

export type PinCategory =
  | 'food'
  | 'neighborhood'
  | 'outdoors'
  | 'fitness'
  | 'culture'
  | 'other';

export interface CategoryOption {
  key: PinCategory;
  label: string;
  hint: string;
}

export const CATEGORIES: readonly CategoryOption[] = [
  { key: 'food', label: '美食', hint: '我做的美味食物' },
  { key: 'neighborhood', label: '街区', hint: '楼下公园' },
  { key: 'outdoors', label: '自然', hint: '水鸟很多的水库' },
  { key: 'fitness', label: '运动', hint: '可以攀岩的城堡' },
  { key: 'culture', label: '文化创意', hint: '和朋友一起办读书会' },
  { key: 'other', label: '其他', hint: '私人角落等' },
] as const;

export const CATEGORY_LABEL: Record<PinCategory, string> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.key] = c.label;
    return acc;
  },
  {} as Record<PinCategory, string>,
);

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
  category: PinCategory;
  imageBlob?: Blob;
}

/** Output shape exposed to the UI. `imageUrl` may be a remote URL or a data: URL.
 *  `category` is optional so historical pins (pre-category) still parse. */
export interface Pin extends PinFields {
  id: string;
  createdAt: number;
  likes: number;
  imageUrl?: string;
  category?: PinCategory;
}
