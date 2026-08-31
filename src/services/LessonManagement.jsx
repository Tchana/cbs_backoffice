import { supabase } from "../lib/supabase";
import {
  saveLessonWithResources,
  updateLessonWithResources,
} from "./CourseContentManagement";

export const CreateLesson = async (courseId, lessonTitle, lessonDescription, resources = []) => {
  return saveLessonWithResources(courseId, {
    title: lessonTitle,
    description: lessonDescription,
    resources,
  });
};

export const DeleteLesson = async (lessonId) => {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(error.message);
  return { success: true };
};

export const EditLesson = async (lessonId, title, description, resources = []) => {
  const { data: lesson } = await supabase
    .from("lessons")
    .select("course_id")
    .eq("id", lessonId)
    .single();
  if (!lesson) throw new Error("Lesson not found");

  return updateLessonWithResources(lesson.course_id, lessonId, {
    title,
    description,
    resources,
  });
};
