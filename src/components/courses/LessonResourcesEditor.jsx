import { Plus, Trash2 } from "lucide-react";
import { RESOURCE_TYPES } from "../../services/CourseContentManagement";

const emptyResource = () => ({
  id: crypto.randomUUID(),
  resourceType: "link",
  title: "",
  url: "",
  sourceKind: "external",
  file: null,
});

const LessonResourcesEditor = ({ resources = [], onChange }) => {
  const list = resources.length > 0 ? resources : [];

  const updateResource = (id, patch) => {
    onChange(list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addResource = () => onChange([...list, emptyResource()]);

  const removeResource = (id) => onChange(list.filter((r) => r.id !== id));

  return (
    <div className="space-y-3">
      {list.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No resources yet.</p>
      ) : (
        list.map((resource, index) => (
          <div
            key={resource.id}
            className="rounded-lg border border-gray-600 bg-gray-800/50 p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Resource {index + 1}</span>
              <button
                type="button"
                onClick={() => removeResource(resource.id)}
                className="text-red-400 hover:text-red-300"
                aria-label="Remove resource"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                className="px-2 py-2 bg-gray-600 text-white rounded-md text-sm"
                value={resource.resourceType || "link"}
                onChange={(e) =>
                  updateResource(resource.id, { resourceType: e.target.value })
                }
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                className="px-2 py-2 bg-gray-600 text-white rounded-md text-sm"
                value={resource.sourceKind || "external"}
                onChange={(e) =>
                  updateResource(resource.id, {
                    sourceKind: e.target.value,
                    file: null,
                    url: e.target.value === "upload" ? "" : resource.url,
                  })
                }
              >
                <option value="external">External URL</option>
                <option value="upload">Upload file</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="Title (optional)"
              className="w-full px-2 py-2 bg-gray-600 text-white rounded-md text-sm"
              value={resource.title ?? ""}
              onChange={(e) =>
                updateResource(resource.id, { title: e.target.value })
              }
            />
            {resource.sourceKind === "upload" ? (
              <input
                type="file"
                className="w-full text-sm text-gray-300 file:mr-2 file:rounded file:border-0 file:bg-indigo-600 file:px-2 file:py-1 file:text-white"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  updateResource(resource.id, { file, url: "" });
                }}
              />
            ) : (
              <input
                type="url"
                placeholder="https://..."
                className="w-full px-2 py-2 bg-gray-600 text-white rounded-md text-sm"
                value={resource.url ?? ""}
                onChange={(e) =>
                  updateResource(resource.id, { url: e.target.value })
                }
              />
            )}
            {resource.file instanceof File ? (
              <p className="text-xs text-gray-400">Selected: {resource.file.name}</p>
            ) : resource.url ? (
              <p className="text-xs text-gray-500 truncate">{resource.url}</p>
            ) : null}
          </div>
        ))
      )}
      <button
        type="button"
        onClick={addResource}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-500"
      >
        <Plus size={14} />
        Add resource
      </button>
    </div>
  );
};

export default LessonResourcesEditor;
