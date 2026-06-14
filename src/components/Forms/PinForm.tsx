import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { compressImage } from '../../services/imageCompress';
import { prefs } from '../../services/prefs';
import {
  ANONYMOUS_AUTHOR,
  CATEGORIES,
  type PinCategory,
  type PinDraft,
  type PinKind,
} from '../../types/pin';
import './PinForm.css';

interface Props {
  initialKind: PinKind;
  lng: number;
  lat: number;
  onSubmit: (draft: PinDraft) => Promise<void> | void;
  onCancel: () => void;
}

const KIND_LABEL: Record<PinKind, string> = {
  doing: '我在这里做过的事情',
  wishlist: '我想去做的事情',
};

export function PinForm({ initialKind, lng, lat, onSubmit, onCancel }: Props) {
  const [kind, setKind] = useState<PinKind>(initialKind);
  const [category, setCategory] = useState<PinCategory | null>(null);
  const [lookingForCompany, setLookingForCompany] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [author, setAuthor] = useState(() => prefs.getLastAuthor());
  const [imageBlob, setImageBlob] = useState<Blob | undefined>(undefined);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined);
  const [imageError, setImageError] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imageBlob) {
      setImagePreviewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(imageBlob);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageBlob]);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageError(null);
    setCompressing(true);
    try {
      const blob = await compressImage(file);
      setImageBlob(blob);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '图片处理失败');
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category) return;
    setSubmitting(true);
    try {
      const trimmedAuthor = author.trim();
      prefs.setLastAuthor(trimmedAuthor);
      await onSubmit({
        kind,
        category,
        lookingForCompany: kind === 'wishlist' ? lookingForCompany : undefined,
        title: title.trim(),
        note: note.trim(),
        lng,
        lat,
        author: trimmedAuthor || ANONYMOUS_AUTHOR,
        imageBlob,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="pin-form" onSubmit={handleSubmit}>
      <h2 className="pin-form-title">新增一个标记</h2>
      <p className="pin-form-coords">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>

      <div className="pin-form-segment">
        {(['doing', 'wishlist'] as PinKind[]).map((k) => (
          <button
            key={k}
            type="button"
            className={`pin-form-segment-btn ${kind === k ? 'is-active' : ''} kind-${k}`}
            onClick={() => setKind(k)}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="pin-form-label">
        类型
        <div className="pin-form-categories" role="radiogroup" aria-label="类型">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={category === c.key}
              className={`pin-form-category ${category === c.key ? 'is-active' : ''}`}
              onClick={() => setCategory(c.key)}
            >
              <span className="pin-form-category-label">{c.label}</span>
              <span className="pin-form-category-hint">{c.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {kind === 'wishlist' && (
        <label className="pin-form-check">
          <input
            type="checkbox"
            checked={lookingForCompany}
            onChange={(e) => setLookingForCompany(e.target.checked)}
          />
          <span>我在找人一起</span>
        </label>
      )}

      <label className="pin-form-label">
        标题
        <input
          className="pin-form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="例如：我在这里吃了 fish & chips"
          autoFocus
          maxLength={80}
        />
      </label>

      <label className="pin-form-label">
        展开说说
        <textarea
          className="pin-form-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="多说几句…"
          rows={4}
          maxLength={500}
        />
      </label>

      <div className="pin-form-label">
        图片
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="pin-form-file-hidden"
        />
        {imagePreviewUrl ? (
          <div className="pin-form-image-preview">
            <img src={imagePreviewUrl} alt="预览" />
            <button
              type="button"
              className="pin-form-image-remove"
              onClick={() => setImageBlob(undefined)}
              aria-label="移除图片"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="pin-form-image-add"
            onClick={() => fileInputRef.current?.click()}
            disabled={compressing}
          >
            {compressing ? '处理中…' : '＋ 添加图片'}
          </button>
        )}
        {imageError && <span className="pin-form-image-error">{imageError}</span>}
      </div>

      <label className="pin-form-label">
        名字
        <input
          className="pin-form-input"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder={ANONYMOUS_AUTHOR}
          maxLength={24}
        />
      </label>

      <div className="pin-form-actions">
        <button type="button" className="pin-form-btn pin-form-btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button
          type="submit"
          className="pin-form-btn pin-form-btn-primary"
          disabled={submitting || compressing || !title.trim() || !category}
        >
          {submitting ? '保存中…' : '保存'}
        </button>
      </div>
    </form>
  );
}
