export default function PlaceholderPage({ title, description }) {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
        <h1 className="text-2xl font-medium text-neutral-900 mb-2">{title || "Page"}</h1>
        {description && (
          <p className="text-neutral-600 mb-6">{description}</p>
        )}
        <p className="text-neutral-500">Content will be added here</p>
      </div>
    </div>
  );
}

