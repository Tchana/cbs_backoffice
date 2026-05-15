import { useEffect, useMemo, useState } from "react";
import Header from "../components/common/Header";
import { useApiLoader } from "../contexts/ApiLoaderContext";
import { GetCourses } from "../services/CourseManagement";
import {
  CreateAnnouncement,
  DeleteAnnouncement,
  GetAnnouncementActor,
  GetAnnouncements,
  UpdateAnnouncement,
} from "../services/AnnouncementManagement";

const AnnouncementsPage = () => {
  const runWithLoader = useApiLoader().runWithLoader;
  const [courses, setCourses] = useState([]);
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [courseId, setCourseId] = useState("");
  const [published, setPublished] = useState(true);
  const [visibleForDays, setVisibleForDays] = useState(7);
  const [saving, setSaving] = useState(false);
  const [actor, setActor] = useState({ id: "", role: "" });

  const canDeleteAnnouncement = (announcement) =>
    actor.role === "admin" || announcement.created_by === actor.id;

  const loadAll = async () => {
    const [courseRows, announcementRows, currentActor] = await runWithLoader(() =>
      Promise.all([GetCourses(), GetAnnouncements(), GetAnnouncementActor()])
    );
    setCourses(courseRows || []);
    setItems(announcementRows || []);
    setActor(currentActor || { id: "", role: "" });
  };

  useEffect(() => {
    loadAll().catch((e) => console.error("Failed to load announcements page", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(
    () => title.trim().length > 0 && body.trim().length > 0,
    [title, body]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await runWithLoader(() =>
        CreateAnnouncement({
          title,
          body,
          courseId: courseId || null,
          published,
          visibleForDays,
        })
      );
      setTitle("");
      setBody("");
      setCourseId("");
      setPublished(true);
      setVisibleForDays(7);
      await loadAll();
    } catch (err) {
      console.error("Create announcement failed", err);
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (a) => {
    try {
      await runWithLoader(() =>
        UpdateAnnouncement(a.id, { published: !a.published })
      );
      await loadAll();
    } catch (e) {
      console.error("Toggle announcement publish failed", e);
    }
  };

  const deleteItem = async (a) => {
    if (!canDeleteAnnouncement(a)) {
      window.alert("Teachers can only delete their own announcements.");
      return;
    }
    const ok = window.confirm("Delete this announcement?");
    if (!ok) return;
    try {
      await runWithLoader(() => DeleteAnnouncement(a.id));
      await loadAll();
    } catch (e) {
      console.error("Delete announcement failed", e);
    }
  };

  const updateVisibleWindow = async (announcement, days) => {
    try {
      await runWithLoader(() =>
        UpdateAnnouncement(announcement.id, { visibleForDays: Number(days) })
      );
      await loadAll();
    } catch (e) {
      console.error("Update visibility window failed", e);
    }
  };

  return (
    <div className="flex-1 relative z-10 overflow-auto">
      <Header title={"Announcements"} />

      <main className="max-w-7xl mx-auto py-6 px-4 lg:px-8 space-y-6">
        <section className="bg-gray-800/80 border border-gray-700 rounded-lg p-4">
          <h2 className="text-white font-semibold mb-3">Create announcement</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              required
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Announcement message"
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded-md"
              required
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="px-3 py-2 bg-gray-700 text-white rounded-md"
              >
                <option value="">Global (all students)</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <label className="text-gray-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                />
                Published
              </label>
              <select
                value={visibleForDays}
                onChange={(e) => setVisibleForDays(Number(e.target.value))}
                className="px-3 py-2 bg-gray-700 text-white rounded-md"
              >
                <option value={1}>Visible for 1 day</option>
                <option value={3}>Visible for 3 days</option>
                <option value={7}>Visible for 1 week</option>
                <option value={14}>Visible for 2 weeks</option>
                <option value={30}>Visible for 1 month</option>
              </select>
              <button
                type="submit"
                disabled={!canSubmit || saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Post announcement"}
              </button>
            </div>
          </form>
        </section>

        <section className="bg-gray-800/80 border border-gray-700 rounded-lg p-4">
          <h2 className="text-white font-semibold mb-3">Recent announcements</h2>
          <div className="space-y-3">
            {items.length === 0 ? (
              <p className="text-gray-400">No announcements yet.</p>
            ) : (
              items.map((a) => (
                <div
                  key={a.id}
                  className="bg-gray-700 rounded-lg p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-white font-medium">{a.title}</p>
                    <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">
                      {a.body}
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      {a.course?.title ? `Course: ${a.course.title}` : "Global"} ·{" "}
                      {new Date(a.created_at).toLocaleString()} · Visible:{" "}
                      {a.visible_for_days || 7} day(s) · Expires:{" "}
                      {a.visible_until ? new Date(a.visible_until).toLocaleString() : "-"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <select
                      value={a.visible_for_days || 7}
                      onChange={(e) => updateVisibleWindow(a, e.target.value)}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded-md"
                    >
                      <option value={1}>1 day</option>
                      <option value={3}>3 days</option>
                      <option value={7}>1 week</option>
                      <option value={14}>2 weeks</option>
                      <option value={30}>1 month</option>
                    </select>
                    <button
                      onClick={() => togglePublished(a)}
                      className="px-3 py-1 text-xs bg-yellow-600 text-white rounded-md hover:bg-yellow-500"
                    >
                      {a.published ? "Unpublish" : "Publish"}
                    </button>
                    {canDeleteAnnouncement(a) ? (
                      <button
                        onClick={() => deleteItem(a)}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-500"
                      >
                        Delete
                      </button>
                    ) : (
                      <button
                        disabled
                        title="Only admins or the creator can delete this announcement"
                        className="px-3 py-1 text-xs bg-red-900/50 text-gray-300 rounded-md cursor-not-allowed"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AnnouncementsPage;

