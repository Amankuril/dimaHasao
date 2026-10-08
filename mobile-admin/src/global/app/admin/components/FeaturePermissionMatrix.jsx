/* Ported from Frontend/src/modules/Global/app/admin/components/FeaturePermissionMatrix.jsx (tools/port.js first pass). */
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
import { Check } from 'lucide-react-native';
import { Button, Div, P, Span, Icon as UiIcon } from '../../../../components/web';
const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
};
/** A 44 px tap target around a 24 px box, so a thumb can hit it. */
const Box = ({ checked, onChange, title }) => (
  <Button type="button" onClick={onChange} accessibilityLabel={title} className="h-11 w-11 items-center justify-center">
    <Div className={`h-6 w-6 rounded-md border items-center justify-center ${checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
      {checked ? <UiIcon as={Check} size={14} strokeWidth={3} className="text-white" /> : null}
    </Div>
  </Button>
);
export default function FeaturePermissionMatrix({ catalogue = [], actions = ['view', 'create', 'edit', 'delete'], modules = [], value = {}, onChange }) {
  const granted = (permission, action) => Boolean(value?.[permission]?.[action]);
  const setOne = (permission, action, next) => {
    const current = {
      ...(value[permission] || {}),
    };
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
    const nextValue = {
      ...value,
    };
    if (Object.keys(current).length) nextValue[permission] = current;
    else delete nextValue[permission];
    onChange(nextValue);
  };
  const setRow = (permission, next) => {
    const nextValue = {
      ...value,
    };
    if (next) nextValue[permission] = Object.fromEntries(actions.map((a) => [a, true]));
    else delete nextValue[permission];
    onChange(nextValue);
  };
  const setModule = (moduleFeatures, next) => {
    const nextValue = {
      ...value,
    };
    moduleFeatures.forEach(({ permission }) => {
      if (next) nextValue[permission] = Object.fromEntries(actions.map((a) => [a, true]));
      else delete nextValue[permission];
    });
    onChange(nextValue);
  };
  const visible = catalogue.filter((entry) => modules.includes(entry.module));
  if (!visible.length) {
    return (
      <P className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-4">
        Choose at least one module above, then pick what this admin may do inside it.
      </P>
    );
  }
  return (
    <Div className="gap-3">
      {visible.map(({ module, features }) => {
        const allOn = features.every(({ permission }) => actions.every((action) => granted(permission, action)));
        return (
          <Div key={module} className="border border-slate-200 rounded-lg overflow-hidden">
            <Div className="flex-row items-center justify-between gap-2 bg-slate-50 px-3 py-2 border-b border-slate-200">
              <Span className="text-sm font-semibold text-slate-800 capitalize">{module}</Span>
              <Button
                type="button"
                onClick={() => setModule(features, !allOn)}
                className="h-11 px-3 items-center justify-center"
              >
                <Span className="text-xs font-semibold uppercase tracking-wide text-blue-600">{allOn ? 'Clear all' : 'Select all'}</Span>
              </Button>
            </Div>

            <Div>
              <Div className="flex-row items-center px-3 py-1.5 bg-white border-b border-slate-100">
                <Span className="flex-1" />
                {actions.map((action) => (
                  <Span key={action} className="w-11 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {ACTION_LABELS[action] || action}
                  </Span>
                ))}
              </Div>

              {features.map(({ key, label, permission }) => {
                const rowOn = actions.every((action) => granted(permission, action));
                return (
                  <Div key={key} className="flex-row items-center px-3 border-b border-slate-100">
                    <Button type="button" onClick={() => setRow(permission, !rowOn)} className="flex-1 py-3 pr-2">
                      <Span className="text-sm text-slate-700">{label}</Span>
                    </Button>

                    {actions.map((action) => (
                      <Div key={action} className="w-11 items-center justify-center">
                        <Box
                          checked={granted(permission, action)}
                          onChange={() => setOne(permission, action, !granted(permission, action))}
                          title={`${ACTION_LABELS[action] || action} — ${label}`}
                        />
                      </Div>
                    ))}
                  </Div>
                );
              })}
            </Div>
          </Div>
        );
      })}
    </Div>
  );
}
