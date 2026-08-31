import { Plus, Trash2, Video } from "lucide-react";

const emptyVideo = () => ({ id: crypto.randomUUID(), title: "", url: "" });

const OverviewVideosEditor = ({ videos = [], onChange }) => {
  const list = videos.length > 0 ? videos : [];

  const updateVideo = (id, patch) => {
    onChange(list.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  };

  const addVideo = () => onChange([...list, emptyVideo()]);

  const removeVideo = (id) => {
    const next = list.filter((v) => v.id !== id);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {list.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No overview videos yet.</p>
      ) : (
        list.map((video, index) => (
          <div
            key={video.id}
            className="rounded-lg border border-gray-600 bg-gray-700/60 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Video size={16} className="text-indigo-400" />
                Video {index + 1}
              </div>
              <button
                type="button"
                onClick={() => removeVideo(video.id)}
                className="text-red-400 hover:text-red-300"
                aria-label="Remove video"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <input
              type="text"
              placeholder="Title (optional)"
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-md text-sm"
              value={video.title ?? ""}
              onChange={(e) => updateVideo(video.id, { title: e.target.value })}
            />
            <input
              type="url"
              placeholder="Video URL (YouTube, Vimeo, etc.)"
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-md text-sm"
              value={video.url ?? ""}
              onChange={(e) => updateVideo(video.id, { url: e.target.value })}
            />
          </div>
        ))
      )}
      <button
        type="button"
        onClick={addVideo}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-500"
      >
        <Plus size={16} />
        Add overview video
      </button>
    </div>
  );
};

export default OverviewVideosEditor;
