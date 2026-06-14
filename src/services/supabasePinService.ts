import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ANONYMOUS_AUTHOR,
  type Pin,
  type PinCategory,
  type PinDraft,
  type PinKind,
} from '../types/pin';
import type { PinService } from './pinService';
import { prefs } from './prefs';
import { PIN_IMAGES_BUCKET, supabase } from './supabase';

interface PinRow {
  id: string;
  kind: PinKind;
  title: string;
  note: string;
  lng: number;
  lat: number;
  author: string;
  image_path: string | null;
  likes: number;
  created_at: string;
  category: PinCategory | null;
  looking_for_company: boolean | null;
}

const PIN_COLUMNS =
  'id, kind, title, note, lng, lat, author, image_path, likes, created_at, category, looking_for_company';

function rowToPin(row: PinRow, client: SupabaseClient): Pin {
  const imageUrl = row.image_path
    ? client.storage.from(PIN_IMAGES_BUCKET).getPublicUrl(row.image_path).data.publicUrl
    : undefined;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    note: row.note,
    lng: row.lng,
    lat: row.lat,
    author: row.author || ANONYMOUS_AUTHOR,
    likes: row.likes,
    createdAt: new Date(row.created_at).getTime(),
    imageUrl,
    category: row.category ?? undefined,
    lookingForCompany: row.looking_for_company ? true : undefined,
  };
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

export function makeSupabasePinService(client: SupabaseClient): PinService {
  return {
    async list() {
      const { data, error } = await client
        .from('pins')
        .select(PIN_COLUMNS)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as PinRow[]).map((row) => rowToPin(row, client));
    },

    async create(draft: PinDraft) {
      const id = uid();
      const ownerToken = uid();
      let image_path: string | null = null;

      if (draft.imageBlob) {
        const ext = extFromMime(draft.imageBlob.type);
        const path = `pins/${id}.${ext}`;
        const { error: upErr } = await client.storage
          .from(PIN_IMAGES_BUCKET)
          .upload(path, draft.imageBlob, {
            contentType: draft.imageBlob.type || 'image/jpeg',
            upsert: false,
          });
        if (upErr) throw upErr;
        image_path = path;
      }

      const author = draft.author.trim() || ANONYMOUS_AUTHOR;
      const { data, error } = await client
        .from('pins')
        .insert({
          id,
          kind: draft.kind,
          title: draft.title,
          note: draft.note,
          lng: draft.lng,
          lat: draft.lat,
          author,
          image_path,
          owner_token: ownerToken,
          category: draft.category,
          looking_for_company:
            draft.kind === 'wishlist' ? draft.lookingForCompany === true : false,
        })
        .select(PIN_COLUMNS)
        .single();
      if (error) throw error;

      prefs.setOwnerToken(id, ownerToken);
      return rowToPin(data as PinRow, client);
    },

    async remove(id) {
      const token = prefs.getOwnerToken(id);
      if (!token) throw new Error('你不是这个标记的创建者');

      // Grab the image path before the row disappears.
      const { data: pinRow } = await client
        .from('pins')
        .select('image_path')
        .eq('id', id)
        .maybeSingle();

      const { error } = await client.rpc('delete_pin', { p_id: id, p_token: token });
      if (error) throw error;

      // Storage cleanup goes through the Storage API (Supabase blocks raw SQL
      // deletes on storage.objects). The orphan-only RLS policy will only let
      // this through if the pin row really is gone.
      if (pinRow?.image_path) {
        await client.storage
          .from(PIN_IMAGES_BUCKET)
          .remove([pinRow.image_path])
          .catch(() => undefined);
      }

      prefs.removeOwnerToken(id);
    },

    async like(id) {
      const { error } = await client.rpc('toggle_pin_like', { p_id: id, p_delta: 1 });
      if (error) throw error;
      const { data, error: e2 } = await client
        .from('pins')
        .select(PIN_COLUMNS)
        .eq('id', id)
        .single();
      if (e2) throw e2;
      return rowToPin(data as PinRow, client);
    },

    async unlike(id) {
      const { error } = await client.rpc('toggle_pin_like', { p_id: id, p_delta: -1 });
      if (error) throw error;
      const { data, error: e2 } = await client
        .from('pins')
        .select(PIN_COLUMNS)
        .eq('id', id)
        .single();
      if (e2) throw e2;
      return rowToPin(data as PinRow, client);
    },

    subscribe(onChange) {
      const channel = client
        .channel('pins-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pins' }, () => {
          onChange();
        })
        .subscribe();
      return () => {
        client.removeChannel(channel);
      };
    },
  };
}

export const supabasePinService = supabase ? makeSupabasePinService(supabase) : null;
