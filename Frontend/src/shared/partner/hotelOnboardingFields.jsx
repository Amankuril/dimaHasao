/**
 * The two hotel onboarding steps — business/owner details, then identity
 * documents — as plain presentational pieces (values/onChange/errors in,
 * JSX out, no API calls, no navigation).
 *
 * Three places render them: the standalone hotel-only wizard
 * (Hotel/app/partner/pages/HotelOnboarding.jsx), the "both" combined wizard's
 * steps 4-5 (Food/pages/restaurant/Onboarding.jsx), and the "add a hotel
 * later" settings screen (AddHotelBusiness.jsx). Keeping the fields here once
 * means those three don't drift into three different hotel forms.
 */
import { Upload, FileImage, X } from 'lucide-react';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PINCODE_REGEX = /^\d{6}$/;

export const HOTEL_BUSINESS_DEFAULTS = {
  businessName: '',
  ownerName: '',
  email: '',
  addressLine1: '',
  city: '',
  state: '',
  pincode: '',
};

export const HOTEL_DOCUMENTS_DEFAULTS = {
  aadhaarNumber: '',
  aadhaarFront: null,
  aadhaarBack: null,
  panNumber: '',
  panCardImage: null,
};

export const validateHotelBusinessFields = (values) => {
  const errors = [];
  if (!String(values.businessName || '').trim()) errors.push('Business or contact name is required');
  if (!String(values.ownerName || '').trim()) errors.push("Owner's full name is required");
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email).trim())) {
    errors.push('Enter a valid email address');
  }
  if (!String(values.addressLine1 || '').trim()) errors.push('Address is required');
  if (!String(values.city || '').trim()) errors.push('City is required');
  if (!String(values.state || '').trim()) errors.push('State is required');
  if (!PINCODE_REGEX.test(String(values.pincode || '').trim())) errors.push('Enter a valid 6-digit pincode');
  return errors;
};

export const validateHotelDocumentFields = (values) => {
  const errors = [];
  if (!AADHAAR_REGEX.test(String(values.aadhaarNumber || '').trim())) errors.push('Enter a valid 12-digit Aadhaar number');
  if (!values.aadhaarFront) errors.push('Aadhaar front photo is required');
  if (!values.aadhaarBack) errors.push('Aadhaar back photo is required');
  if (!PAN_REGEX.test(String(values.panNumber || '').trim().toUpperCase())) errors.push('Enter a valid PAN number');
  if (!values.panCardImage) errors.push('PAN card photo is required');
  return errors;
};

const fieldLabel = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500';
const fieldInput = 'w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-900';

export function HotelBusinessFields({ values, onChange }) {
  const set = (key) => (event) => onChange({ ...values, [key]: event.target.value });

  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Business / contact name</label>
        <input value={values.businessName} onChange={set('businessName')} placeholder="e.g. Hasao Heritage Stays" className={fieldInput} />
      </div>
      <div>
        <label className={fieldLabel}>Owner's full name</label>
        <input value={values.ownerName} onChange={set('ownerName')} placeholder="Full legal name" className={fieldInput} />
      </div>
      <div>
        <label className={fieldLabel}>
          Email <span className="font-normal normal-case text-slate-400">(optional)</span>
        </label>
        <input value={values.email} onChange={set('email')} type="email" placeholder="you@example.com" className={fieldInput} />
      </div>
      <div>
        <label className={fieldLabel}>Address</label>
        <input value={values.addressLine1} onChange={set('addressLine1')} placeholder="Street / locality" className={fieldInput} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabel}>City</label>
          <input value={values.city} onChange={set('city')} placeholder="City" className={fieldInput} />
        </div>
        <div>
          <label className={fieldLabel}>State</label>
          <input value={values.state} onChange={set('state')} placeholder="State" className={fieldInput} />
        </div>
      </div>
      <div>
        <label className={fieldLabel}>Pincode</label>
        <input
          value={values.pincode}
          onChange={(event) => onChange({ ...values, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) })}
          inputMode="numeric"
          placeholder="6-digit pincode"
          className={fieldInput}
        />
      </div>
    </div>
  );
}

function DocumentUploadTile({ label, file, onSelect, onClear }) {
  return (
    <div>
      <label className={fieldLabel}>{label}</label>
      {file ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 truncate text-slate-700">
            <FileImage size={15} className="shrink-0 text-slate-400" />
            <span className="truncate">{file.name || 'Photo selected'}</span>
          </span>
          <button type="button" onClick={onClear} className="shrink-0 text-slate-400 hover:text-slate-700" aria-label={`Remove ${label}`}>
            <X size={15} />
          </button>
        </div>
      ) : (
        <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 hover:border-slate-900 hover:text-slate-900">
          <Upload size={15} />
          Upload photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => onSelect(event.target.files?.[0] || null)}
          />
        </label>
      )}
    </div>
  );
}

export function HotelDocumentsFields({ values, onChange }) {
  const set = (key) => (event) => onChange({ ...values, [key]: event.target.value });

  return (
    <div className="space-y-4">
      <div>
        <label className={fieldLabel}>Aadhaar number</label>
        <input
          value={values.aadhaarNumber}
          onChange={(event) => onChange({ ...values, aadhaarNumber: event.target.value.replace(/\D/g, '').slice(0, 12) })}
          inputMode="numeric"
          placeholder="12-digit Aadhaar number"
          className={fieldInput}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DocumentUploadTile
          label="Aadhaar front"
          file={values.aadhaarFront}
          onSelect={(file) => onChange({ ...values, aadhaarFront: file })}
          onClear={() => onChange({ ...values, aadhaarFront: null })}
        />
        <DocumentUploadTile
          label="Aadhaar back"
          file={values.aadhaarBack}
          onSelect={(file) => onChange({ ...values, aadhaarBack: file })}
          onClear={() => onChange({ ...values, aadhaarBack: null })}
        />
      </div>
      <div>
        <label className={fieldLabel}>PAN number</label>
        <input
          value={values.panNumber}
          onChange={(event) => onChange({ ...values, panNumber: event.target.value.toUpperCase().slice(0, 10) })}
          placeholder="ABCDE1234F"
          className={fieldInput}
        />
      </div>
      <DocumentUploadTile
        label="PAN card photo"
        file={values.panCardImage}
        onSelect={(file) => onChange({ ...values, panCardImage: file })}
        onClear={() => onChange({ ...values, panCardImage: null })}
      />
    </div>
  );
}

/** Builds the multipart body the KYC endpoint expects from both step states. */
export const buildHotelKycFormData = (businessValues, documentValues) => {
  const formData = new FormData();
  formData.append('ownerName', String(businessValues.ownerName || '').trim());
  formData.append('street', String(businessValues.addressLine1 || '').trim());
  formData.append('city', String(businessValues.city || '').trim());
  formData.append('state', String(businessValues.state || '').trim());
  formData.append('zipCode', String(businessValues.pincode || '').trim());
  formData.append('aadhaarNumber', String(documentValues.aadhaarNumber || '').trim());
  formData.append('panNumber', String(documentValues.panNumber || '').trim().toUpperCase());
  if (documentValues.aadhaarFront) formData.append('aadhaarFront', documentValues.aadhaarFront);
  if (documentValues.aadhaarBack) formData.append('aadhaarBack', documentValues.aadhaarBack);
  if (documentValues.panCardImage) formData.append('panCardImage', documentValues.panCardImage);
  return formData;
};
