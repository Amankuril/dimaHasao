/**
 * Pick an image, upload it, keep the URL.
 *
 * Uploading on selection rather than on form submit is deliberate: the admin
 * sees immediately whether the file was accepted, and the form only ever holds
 * a URL string. Replacing passes the previous URL so the server deletes it as
 * it writes the new one — the disk never accumulates orphans from re-edits.
 */
import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadImage, deleteImage } from '../../../services/uploadService';
import toast from 'react-hot-toast';

const ImageField = ({ label, value, onChange, folder = 'tours/destinations', hint, className = '' }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    // Reset first, so re-picking the same file still fires a change.
    event.target.value = '';
    if (!file) return;

    try {
      setBusy(true);
      const url = await uploadImage(file, { folder, replaceUrl: value });
      onChange(url);
    } catch (error) {
      toast.error(error.message || 'Could not upload that image');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    const previous = value;
    onChange('');
    if (previous) await deleteImage(previous);
  };

  return (
    <div className={className}>
      {label && <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">{label}</label>}

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="relative w-28 h-24 shrink-0 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-[#0a4d2b]/40 hover:bg-gray-100 transition-colors flex items-center justify-center overflow-hidden disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={20} className="animate-spin text-gray-400" />
          ) : value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-gray-400">
              <ImagePlus size={20} />
              <span className="text-[10px] font-bold">Upload</span>
            </span>
          )}
        </button>

        <div className="flex-1 min-w-0 pt-1">
          <p className="text-xs text-gray-500">
            {hint || 'JPG, PNG, HEIC or WebP. Stored as compressed WebP.'}
          </p>
          {value && (
            <div className="flex items-center gap-2 mt-2">
              <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
                className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Replace
              </button>
              <button type="button" onClick={clear} disabled={busy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">
                <X size={12} /> Remove
              </button>
            </div>
          )}
        </div>
      </div>

      <input ref={inputRef} type="file" accept="image/*" onChange={pick} className="hidden" />
    </div>
  );
};

/** The same control for an ordered list of images. */
export const ImageListField = ({ label, value = [], onChange, folder, max = 8 }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const add = async (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    if (!files.length) return;

    const room = Math.max(0, max - value.length);
    if (!room) return toast.error(`Up to ${max} images`);

    try {
      setBusy(true);
      const urls = [];
      for (const file of files.slice(0, room)) {
        urls.push(await uploadImage(file, { folder }));
      }
      onChange([...value, ...urls]);
    } catch (error) {
      toast.error(error.message || 'Could not upload those images');
    } finally {
      setBusy(false);
    }
  };

  const removeAt = async (index) => {
    const url = value[index];
    onChange(value.filter((_, i) => i !== index));
    if (url) await deleteImage(url);
  };

  return (
    <div>
      {label && <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">{label}</label>}

      <div className="flex flex-wrap gap-2">
        {value.map((url, index) => (
          <div key={`${url}-${index}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => removeAt(index)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image">
              <X size={11} />
            </button>
          </div>
        ))}

        {value.length < max && (
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-[#0a4d2b]/40 flex items-center justify-center text-gray-400 disabled:opacity-60">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-1.5">{value.length} of {max}</p>
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={add} className="hidden" />
    </div>
  );
};

export default ImageField;
