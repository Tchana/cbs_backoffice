import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookOpen,
  GraduationCap,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  Trash2,
  Edit2,
} from "lucide-react";
import {
  CreateLesson,
  DeleteLesson,
  EditLesson,
} from "../../services/LessonManagement";
import {
  addCourseComment,
  deleteCourseComment,
  getCourseComments,
} from "../../services/CourseContentManagement";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useApiLoader } from "../../contexts/ApiLoaderContext";
import RichTextDisplay from "../common/RichTextDisplay";
import LessonResourcesEditor from "./LessonResourcesEditor";
import {
  DeleteAssignment,
  GetAssignmentsByCourse,
  UpdateAssignment,
} from "../../services/AssignmentManagement";
import AssignmentCreateModal from "../assignments/AssignmentCreateModal";
import AssignmentGradeModal from "../assignments/AssignmentGradeModal";

const CourseViewModal = ({ course, onClose, onLessonChange }) => {
  const runWithLoader = useApiLoader().runWithLoader;
  if (!course) return null;

  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonResources, setLessonResources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLessonId, setExpandedLessonId] = useState(null);
  const [lessonToDelete, setLessonToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editResources, setEditResources] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [assignments, setAssignments] = useState([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [assignmentToGrade, setAssignmentToGrade] = useState(null);
  const [dueDateDraftById, setDueDateDraftById] = useState({});

  const reloadAssignments = async () => {
    try {
      setIsLoadingAssignments(true);
      const res = await runWithLoader(() =>
        GetAssignmentsByCourse(course.id, { includeUnpublished: true })
      );
      setAssignments(res || []);
      setDueDateDraftById(
        (res || []).reduce((acc, a) => {
          acc[a.id] = a.due_date
            ? new Date(a.due_date).toISOString().slice(0, 16)
            : "";
          return acc;
        }, {})
      );
    } catch (e) {
      console.error("Error loading assignments:", e);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    if (!course?.id) return;
    reloadAssignments();
    reloadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course?.id]);

  const reloadComments = async () => {
    try {
      setIsLoadingComments(true);
      const res = await getCourseComments(course.id);
      setComments(res || []);
    } catch (e) {
      console.error("Error loading comments:", e);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    const content = commentDraft.trim();
    if (!content) return;
    try {
      await runWithLoader(() => addCourseComment(course.id, content));
      setCommentDraft("");
      await reloadComments();
    } catch (e) {
      console.error("Error adding comment:", e);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await runWithLoader(() => deleteCourseComment(commentId));
      await reloadComments();
    } catch (e) {
      console.error("Error deleting comment:", e);
    }
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await runWithLoader(() =>
        CreateLesson(course.id, lessonTitle, lessonDescription, lessonResources)
      );
      setLessonTitle("");
      setLessonDescription("");
      setLessonResources([]);
      setIsCreatingLesson(false);
      onLessonChange?.();
    } catch (error) {
      console.error("Error creating lesson:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    setIsDeleting(true);
    try {
      await runWithLoader(() => DeleteLesson(lessonId));
      setLessonToDelete(null);
      onLessonChange?.();
    } catch (error) {
      console.error("Error deleting lesson:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleLessonExpansion = (lessonId) => {
    setExpandedLessonId(expandedLessonId === lessonId ? null : lessonId);
  };

  const handleFileOpen = (fileUrl) => {
    window.open(fileUrl, "_blank");
  };

  const handleEditLesson = async (lessonId) => {
    setIsEditing(true);
    setEditError("");
    try {
      await runWithLoader(() =>
        EditLesson(
          lessonId,
          editTitle || undefined,
          editDescription || undefined,
          editResources
        )
      );
      setEditingLesson(null);
      setEditTitle("");
      setEditDescription("");
      setEditResources([]);
      onLessonChange?.();
    } catch (error) {
      console.error("Error editing lesson:", error);
      setEditError(error.message || "Failed to edit lesson.");
    } finally {
      setIsEditing(false);
    }
  };

  const startEditing = (lesson) => {
    setEditingLesson(lesson);
    setEditTitle(lesson.title);
    setEditDescription(lesson.description || "");
    setEditResources(
      (lesson.resources || []).map((r) => ({
        id: r.id || crypto.randomUUID(),
        resourceType: r.resourceType || r.resource_type,
        title: r.title || "",
        url: r.url || "",
        sourceKind: r.sourceKind || r.source_kind || "external",
        file: null,
      }))
    );
    setEditError("");
  };

  const handleToggleAssignmentPublished = async (assignment) => {
    try {
      await runWithLoader(() =>
        UpdateAssignment(assignment.id, { published: !assignment.published })
      );
      await reloadAssignments();
    } catch (error) {
      console.error("Error updating assignment published status:", error);
    }
  };

  const handleSaveAssignmentDueDate = async (assignmentId) => {
    try {
      const dueDateRaw = dueDateDraftById[assignmentId] || "";
      await runWithLoader(() =>
        UpdateAssignment(assignmentId, {
          dueDate: dueDateRaw ? new Date(dueDateRaw).toISOString() : null,
        })
      );
      await reloadAssignments();
    } catch (error) {
      console.error("Error updating assignment due date:", error);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    const ok = window.confirm(
      "Delete this assignment? This also removes related questions/submissions."
    );
    if (!ok) return;
    try {
      await runWithLoader(() => DeleteAssignment(assignmentId));
      await reloadAssignments();
    } catch (error) {
      console.error("Error deleting assignment:", error);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative bg-gray-800 rounded-lg p-6 w-[96vw] max-w-6xl shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Fixed Close Button */}
          <div className="sticky -top-6 right-0 z-10 flex justify-end bg-gray-800">
            <button
              className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-gray-700 transition-colors duration-200"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={24} />
            </button>
          </div>

          <h2 className="text-xl font-semibold text-white mb-6">
            Course Details
          </h2>

          <div className="space-y-6">
            {/* Course Title */}
            <div className="flex items-center space-x-3">
              <BookOpen className="w-8 h-8 text-indigo-500" />
              <h3 className="text-lg font-medium text-white">{course.title}</h3>
            </div>

            {/* Course Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm">Teacher</label>
                <p className="text-white font-medium">
                  {course.teacher
                    ? `${course.teacher.firstName ?? ""} ${course.teacher.lastName ?? ""}`.trim() || "—"
                    : "—"}
                </p>
              </div>
              <div>
                <label className="text-gray-400 text-sm">Status</label>
                <p
                  className={`font-medium ${
                    course.active ? "text-green-400" : "text-gray-300"
                  }`}
                >
                  {course.active ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Description</label>
                <p className="text-white font-medium whitespace-pre-wrap">
                  {course.description}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-gray-400 text-sm">Learning Objectives</label>
                <RichTextDisplay
                  value={course.learningObjectives}
                  emptyLabel="No learning objectives set"
                />
              </div>
              {course.overviewVideos?.length > 0 && (
                <div className="col-span-2">
                  <label className="text-gray-400 text-sm">Overview Videos</label>
                  <div className="mt-2 space-y-2">
                    {course.overviewVideos.map((video) => (
                      <a
                        key={video.id}
                        href={video.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-indigo-400 hover:text-indigo-300 text-sm"
                      >
                        {video.title || video.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-gray-400 text-sm">Created At</label>
                <p className="text-white font-medium">
                  {course.createdAt
                    ? new Date(course.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>

            {/* Lessons Section */}
            <div className="pt-6 border-t border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-medium text-white">
                    Course Content
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreatingLesson(!isCreatingLesson)}
                  className="flex items-center space-x-2 px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-200"
                >
                  <Plus size={16} />
                  <span>Add Lesson</span>
                </button>
              </div>

              {isCreatingLesson && (
                <form
                  onSubmit={handleCreateLesson}
                  className="mb-6 space-y-4 bg-gray-700 p-4 rounded-lg relative"
                >
                  <button
                    type="button"
                    onClick={() => setIsCreatingLesson(false)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors duration-200"
                    aria-label="Close form"
                  >
                    <X size={18} />
                  </button>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Lesson Title
                    </label>
                    <input
                      type="text"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={lessonDescription}
                      onChange={(e) => setLessonDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows="3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Resources
                    </label>
                    <LessonResourcesEditor
                      resources={lessonResources}
                      onChange={setLessonResources}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsCreatingLesson(false)}
                      className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-200 disabled:opacity-50"
                    >
                      {isLoading ? "Creating..." : "Create Lesson"}
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                <p className="text-gray-400 text-sm">
                  Total Lessons: {course.lessons?.length || 0}
                </p>
                {course.lessons && course.lessons.length > 0 ? (
                  <div className="space-y-2">
                    {course.lessons.map((lesson, index) => (
                      <div
                        key={lesson.id}
                        className="bg-gray-700 rounded-lg overflow-hidden"
                      >
                        <div
                          className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-600 transition-colors duration-200"
                          onClick={() => toggleLessonExpansion(lesson.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {lesson.title}
                              </p>
                              <p className="text-gray-400 text-sm">
                                Duration: {lesson.duration || "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {(lesson.resources?.length > 0 || lesson.file) && (
                              <span className="text-xs text-gray-400">
                                {lesson.resources?.length || (lesson.file ? 1 : 0)} resource(s)
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(lesson);
                              }}
                              className="p-1 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                              title="Edit lesson"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLessonToDelete(lesson);
                              }}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors duration-200"
                              title="Delete lesson"
                            >
                              <Trash2 size={18} />
                            </button>
                            {expandedLessonId === lesson.id ? (
                              <ChevronUp size={20} className="text-gray-400" />
                            ) : (
                              <ChevronDown
                                size={20}
                                className="text-gray-400"
                              />
                            )}
                          </div>
                        </div>

                        {expandedLessonId === lesson.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-gray-600"
                          >
                            <div className="p-4">
                              <h4 className="text-sm font-medium text-gray-300 mb-2">
                                Description
                              </h4>
                              <p className="text-gray-400 text-sm whitespace-pre-wrap">
                                {lesson.description ||
                                  "No description available"}
                              </p>
                              {(lesson.resources?.length > 0 || lesson.file) && (
                                <div className="mt-4">
                                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                                    Resources
                                  </h4>
                                  <ul className="space-y-1">
                                    {(lesson.resources?.length
                                      ? lesson.resources
                                      : lesson.file
                                        ? [{ title: "PDF", url: lesson.file, resourceType: "pdf" }]
                                        : []
                                    ).map((r) => (
                                      <li key={r.id || r.url}>
                                        <button
                                          type="button"
                                          onClick={() => handleFileOpen(r.url)}
                                          className="text-indigo-400 hover:text-indigo-300 text-sm"
                                        >
                                          {r.title || r.resourceType || "Resource"} — Open
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    No lessons added yet
                  </p>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Discussion</h3>
              {isLoadingComments ? (
                <p className="text-gray-400 text-sm">Loading comments...</p>
              ) : (
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {comments.length === 0 ? (
                    <p className="text-gray-400 text-sm italic">No comments yet.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-white font-medium">
                            {c.authorName}
                            {c.authorRole ? (
                              <span className="text-gray-400 font-normal ml-2">
                                ({c.authorRole})
                              </span>
                            ) : null}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                        <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">
                          {c.content}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(c.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-md text-sm"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 self-end"
                >
                  Post
                </button>
              </div>
            </div>
          </div>

          {/* Assignments Section */}
          <div className="pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-medium text-white">Assignments</h3>
              </div>

              <button
                onClick={() => setIsCreatingAssignment(true)}
                className="flex items-center space-x-2 px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-200"
              >
                <Plus size={16} />
                <span>Create</span>
              </button>
            </div>

            {isLoadingAssignments ? (
              <p className="text-gray-300 text-sm">Loading...</p>
            ) : assignments.length === 0 ? (
              <p className="text-gray-400 text-sm italic">
                No assignments yet.
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="bg-gray-700 rounded-lg p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">
                        {a.title}
                      </p>
                      <p className="text-gray-300 text-sm">
                        Status:{" "}
                        <span className="text-green-400 font-medium">
                          {a.published ? "Published" : "Draft"}
                        </span>
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={dueDateDraftById[a.id] || ""}
                          onChange={(e) =>
                            setDueDateDraftById((prev) => ({
                              ...prev,
                              [a.id]: e.target.value,
                            }))
                          }
                          className="px-2 py-1 bg-gray-800 text-white rounded-md text-xs"
                        />
                        <button
                          className="px-2 py-1 bg-gray-600 text-white rounded-md text-xs hover:bg-gray-500"
                          onClick={() => handleSaveAssignmentDueDate(a.id)}
                        >
                          Save due date
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        className="px-3 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-200"
                        onClick={() => setAssignmentToGrade(a)}
                      >
                        Grade
                      </button>
                      <button
                        className="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-500 transition-colors duration-200"
                        onClick={() => handleToggleAssignmentPublished(a)}
                      >
                        {a.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors duration-200"
                        onClick={() => handleDeleteAssignment(a.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {isCreatingAssignment && (
            <AssignmentCreateModal
              course={course}
              onClose={() => setIsCreatingAssignment(false)}
              onCreated={() => {
                setIsCreatingAssignment(false);
                reloadAssignments();
              }}
            />
          )}

          {assignmentToGrade && (
            <AssignmentGradeModal
              assignment={assignmentToGrade}
              onClose={() => setAssignmentToGrade(null)}
              onSaved={() => reloadAssignments()}
            />
          )}

          {/* Delete Confirmation Modal */}
          {lessonToDelete && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl"
              >
                <h3 className="text-lg font-medium text-white mb-4">
                  Delete Lesson
                </h3>
                <p className="text-gray-300 mb-6">
                  Are you sure you want to delete "{lessonToDelete.title}"? This
                  action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setLessonToDelete(null)}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteLesson(lessonToDelete.id)}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Edit Lesson Modal */}
          {editingLesson && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center">
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl"
              >
                <h3 className="text-lg font-medium text-white mb-4">
                  Edit Lesson
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEditLesson(editingLesson.id);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      rows="3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Resources
                    </label>
                    <LessonResourcesEditor
                      resources={editResources}
                      onChange={setEditResources}
                    />
                  </div>
                  {editError && (
                    <p className="text-sm text-red-400">{editError}</p>
                  )}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setEditingLesson(null)}
                      className="px-4 py-2 text-gray-300 hover:text-white transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isEditing}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 transition-colors duration-200 disabled:opacity-50"
                    >
                      {isEditing ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default CourseViewModal;
