// service to handle course-related operations

const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

const getCourses = async (query, user) => {
  const {
    page = 1,
    limit = 8,
    search = "",
    sort = "",
    category,
    tags,
  } = query;

  // Validate and sanitize pagination parameters
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 8)); // Max 100 items per page

  const filter = {};

  if (search && typeof search === "string") {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { instructorName: { $regex: search, $options: "i" } },
    ];
  }

  if (category && typeof category === "string") {
    filter.category = category;
  }

  if (tags && typeof tags === "string") {
    const tagArray = tags.split(",").map(t => t.trim()).filter(t => t); // "mern,react"
    if (tagArray.length > 0) {
      filter.tags = { $in: tagArray };
    }
  }

  let sortObj = {};
  if (sort === "price_asc") sortObj.price = 1;
  if (sort === "price_desc") sortObj.price = -1;

  const skip = (pageNum - 1) * limitNum;

  const courseQuery = Course.find(filter);
  if (user?.role !== "admin") {
    courseQuery.select("-syllabus");
  }

  const [courses, total] = await Promise.all([
    courseQuery
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum),
    Course.countDocuments(filter),
  ]);

  return {
    courses,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum),
  };
};

const getCourseById = async (id, user) => {
  const isEnrolled = user && user.role !== "admin"
    ? await Enrollment.exists({ student: user.id, course: id })
    : false;
  const includeSyllabus = user?.role === "admin" || isEnrolled;

  const course = await Course.findById(id).select(includeSyllabus ? "" : "-syllabus");
  if (!course) throw new Error("Course not found");

  const courseData = course.toObject();
  if (user?.role !== "admin" && courseData.syllabus) {
    courseData.syllabus = courseData.syllabus.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        quiz: lesson.quiz.map(({ correctIndex, ...question }) => question),
      })),
    }));
  }
  return courseData;
};

module.exports = { getCourses, getCourseById };
