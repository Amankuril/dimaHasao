import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminPageHeader = ({
  module = 'Admin',
  page = '',
  title = '',
  backTo = null,
  right = null,
}) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
        <span>{module}</span>
        <ChevronRight size={12} />
        <span className="text-neutral-700">{page || title}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl text-neutral-900 font-medium">{title || page}</h1>
        <div className="flex items-center gap-2">
          {right}
          {backTo ? (
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
            >
              <ArrowLeft size={16} /> Back
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AdminPageHeader;

