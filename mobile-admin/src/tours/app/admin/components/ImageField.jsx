/* Ported from Frontend/src/modules/Tours/app/admin/components/ImageField.jsx (tools/port.js first pass). */
/**
 * Pick an image, upload it, keep the URL.
 *
 * Uploading on selection rather than on form submit is deliberate: the admin
 * sees immediately whether the file was accepted, and the form only ever holds
 * a URL string. Replacing passes the previous URL so the server deletes it as
 * it writes the new one — the disk never accumulates orphans from re-edits.
 */
import React, { useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react-native';
import { uploadImage, deleteImage } from '../../../services/uploadService';
import { toast } from '../../../../lib/notify';
import { pickImage } from '../../../../lib/files';
import { Button, Div, Img, Label, P, Span, Icon as UiIcon } from '../../../../components/web';
const ImageField = ({ label, value, onChange, folder = 'tours/destinations', hint, className = '' }) => {
  const [busy, setBusy] = useState(false);
  const pick = async () => {
    // The uploader compresses to WebP server-side, so the picker sends the original.
    const file = await pickImage({ compress: false });
    if (!file) return;
    try {
      setBusy(true);
      const url = await uploadImage(file, {
        folder,
        replaceUrl: value,
      });
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
    <Div className={className}>
      {label && <Label className="block text-[13px] font-semibold text-gray-700 mb-1.5">{label}</Label>}

      <Div className="flex items-start gap-3">
        <Button
          type="button"
          onClick={pick}
          disabled={busy}
          className="relative w-28 h-24 shrink-0 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-[#0a4d2b]/40 hover:bg-gray-100 transition-colors flex items-center justify-center overflow-hidden disabled:opacity-60"
        >
          {busy ? (
            <UiIcon as={Loader2} size={20} className="animate-spin text-gray-400" />
          ) : value ? (
            <Img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <Span className="flex flex-col items-center gap-1 text-gray-400">
              <UiIcon as={ImagePlus} size={20} />
              <Span className="text-[10px] font-bold">Upload</Span>
            </Span>
          )}
        </Button>

        <Div className="flex-1 min-w-0 pt-1">
          <P className="text-xs text-gray-500">{hint || 'JPG, PNG, HEIC or WebP. Stored as compressed WebP.'}</P>
          {value && (
            <Div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                onClick={pick}
                disabled={busy}
                className="px-2.5 py-1 rounded-lg border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Replace
              </Button>
              <Button
                type="button"
                onClick={clear}
                disabled={busy}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <UiIcon as={X} size={12} /> Remove
              </Button>
            </Div>
          )}
        </Div>
      </Div>

    </Div>
  );
};

/** The same control for an ordered list of images. */
export const ImageListField = ({ label, value = [], onChange, folder, max = 8 }) => {
  const [busy, setBusy] = useState(false);
  const add = async () => {
    const picked = await pickImage({ multiple: true, compress: false });
    const files = Array.isArray(picked) ? picked : picked ? [picked] : [];
    if (!files.length) return;
    const room = Math.max(0, max - value.length);
    if (!room) return toast.error(`Up to ${max} images`);
    try {
      setBusy(true);
      const urls = [];
      for (const file of files.slice(0, room)) {
        urls.push(
          await uploadImage(file, {
            folder,
          }),
        );
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
    <Div>
      {label && <Label className="block text-[13px] font-semibold text-gray-700 mb-1.5">{label}</Label>}

      <Div className="flex flex-wrap gap-2">
        {value.map((url, index) => (
          <Div key={`${url}-${index}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
            <Img src={url} alt="" className="w-full h-full object-cover" />
            <Button
              type="button"
              onClick={() => removeAt(index)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
              accessibilityLabel="Remove image"
            >
              <UiIcon as={X} size={11} />
            </Button>
          </Div>
        ))}

        {value.length < max && (
          <Button
            type="button"
            onClick={add}
            disabled={busy}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-[#0a4d2b]/40 flex items-center justify-center text-gray-400 disabled:opacity-60"
          >
            {busy ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={ImagePlus} size={16} />}
          </Button>
        )}
      </Div>

      <P className="text-xs text-gray-400 mt-1.5">
        {value.length} of {max}
      </P>
    </Div>
  );
};
export default ImageField;
