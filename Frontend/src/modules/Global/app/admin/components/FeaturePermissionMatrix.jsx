/**
 * What a sub-admin may see and change, module by module.
 *
 * The catalogue comes from the server (`/v1/admin/meta`) rather than a list
 * kept here, because the same catalogue is what the server enforces — a second
 * copy would drift the first time a feature is added and hand out grants that
 * nothing checks.
 *
 * Only modules the admin has been given appear. Ticking a feature nobody can
 * reach is a grant that reads as access and is not one.
 */
import React from 'react';
import { Check } from 'lucide-react';

const ACTION_LABELS = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete' };

const Box = ({ checked, onChange, title }) => (
  <button
    type="button"
    title={title}
    onClick={onChange}
    className={`h-6 w-6 rounded-md border flex items-center justify-center transition ${
      checked
        ? 'bg-[#0a4d2b] border-[#0a4d2b] text-white'
        : 'bg-white border-gray-300 text-transparent hover:border-[#0a4d2b]'
    }`}
  >
    <Check size={13} strokeWidth={3} />
  </button>
);

export default function FeaturePermissionMatrix({
  catalogue = [],
  actions = ['view', 'create', 'edit', 'delete'],
  modules = [],
  value = {},
  onChange,
}) {
  const granted = (permission, action) => Boolean(value?.[permission]?.[action]);

  const setOne = (permission, action, next) => {
    const current = { ...(value[permission] || {}) };

    if (next) {
      current[action] = true;
      // Anything you can change, you can see — granting edit without view
      // produces a row the admin can act on but never open.
      if (action !== 'view') current.view = true;
    } else {
      delete current[action];
      // Losing sight of a row means losing the right to change it too.
      if (action === 'view') actions.forEach((item) => delete current[item]);
    }

    const nextValue = { ...value };
    if (Object.keys(current).length) nextValue[permission] = current;
    else delete nextValue[permission];

    onChange(nextValue);
  };

  const setRow = (permission, next) => {
    const nextValue = { ...value };
    if (next) nextValue[permission] = Object.fromEntries(actions.map((a) => [a, true]));
    else delete nextValue[permission];
    onChange(nextValue);
  };

  const setModule = (moduleFeatures, next) => {
    const nextValue = { ...value };
    moduleFeatures.forEach(({ permission }) => {
      if (next) nextValue[permission] = Object.fromEntries(actions.map((a) => [a, true]));
      else delete nextValue[permission];
    });
    onChange(nextValue);
  };

  const visible = catalogue.filter((entry) => modules.includes(entry.module));

  if (!visible.length) {
    return (
      <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl p-4">
        Choose at least one module above, then pick what this admin may do inside it.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {visible.map(({ module, features }) => {
        const allOn = features.every(({ permission }) =>
          actions.every((action) => granted(permission, action)),
        );

        return (
          <div key={module} className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
              <span className="text-[13px] font-bold text-gray-800 capitalize">{module}</span>
              <button
                type="button"
                onClick={() => setModule(features, !allOn)}
                className="text-[11px] font-bold uppercase tracking-wide text-[#0a4d2b] hover:underline"
              >
                {allOn ? 'Clear all' : 'Select all'}
              </button>
            </div>

            <div className="divide-y divide-gray-100">
              <div className="hidden sm:flex items-center px-4 py-1.5 bg-white">
                <span className="flex-1" />
                {actions.map((action) => (
                  <span
                    key={action}
                    className="w-16 text-center text-[10px] font-bold uppercase tracking-wide text-gray-400"
                  >
                    {ACTION_LABELS[action] || action}
                  </span>
                ))}
              </div>

              {features.map(({ key, label, permission }) => {
                const rowOn = actions.every((action) => granted(permission, action));

                return (
                  <div key={key} className="flex items-center px-4 py-2 hover:bg-gray-50/70">
                    <button
                      type="button"
                      onClick={() => setRow(permission, !rowOn)}
                      className="flex-1 text-left text-[13px] text-gray-700"
                    >
                      {label}
                    </button>

                    {actions.map((action) => (
                      <span key={action} className="w-16 flex justify-center">
                        <Box
                          checked={granted(permission, action)}
                          onChange={() => setOne(permission, action, !granted(permission, action))}
                          title={`${ACTION_LABELS[action] || action} — ${label}`}
                        />
                      </span>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
