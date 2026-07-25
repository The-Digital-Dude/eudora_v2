export interface CourseStep {
  id: string;
  title: string;
  type: "video" | "reading" | "quiz" | "assignment";
  completed: boolean;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  instructor: string;
  status: "published" | "draft" | "archived";
  steps: CourseStep[];
}

export const dummyCourses: Course[] = [
  {
    id: "course-1",
    title: "Algebra Foundations",
    category: "Mathematics",
    instructor: "Ms. Harper",
    status: "published",
    steps: [
      { id: "c1-s1", title: "Introduction to Variables", type: "video", completed: true },
      { id: "c1-s2", title: "Solving Linear Equations", type: "reading", completed: true },
      { id: "c1-s3", title: "Practice Quiz: Equations", type: "quiz", completed: true },
      { id: "c1-s4", title: "Graphing on the Number Line", type: "video", completed: false },
      { id: "c1-s5", title: "Milestone Assignment", type: "assignment", completed: false },
    ],
  },
  {
    id: "course-2",
    title: "Introduction to Cell Biology",
    category: "Science",
    instructor: "Dr. Nakamura",
    status: "published",
    steps: [
      { id: "c2-s1", title: "What is a Cell?", type: "video", completed: true },
      { id: "c2-s2", title: "Cell Structure & Organelles", type: "reading", completed: false },
      { id: "c2-s3", title: "Practice Quiz: Organelles", type: "quiz", completed: false },
      { id: "c2-s4", title: "Lab Report Assignment", type: "assignment", completed: false },
    ],
  },
  {
    id: "course-3",
    title: "Persuasive Essay Writing",
    category: "English",
    instructor: "Mr. Alden",
    status: "draft",
    steps: [
      { id: "c3-s1", title: "Structuring an Argument", type: "video", completed: false },
      { id: "c3-s2", title: "Reading: Rhetorical Devices", type: "reading", completed: false },
      { id: "c3-s3", title: "Draft Your Essay", type: "assignment", completed: false },
    ],
  },
  {
    id: "course-4",
    title: "World History: Ancient Civilizations",
    category: "History",
    instructor: "Mrs. Okafor",
    status: "published",
    steps: [
      { id: "c4-s1", title: "Mesopotamia & the Fertile Crescent", type: "video", completed: true },
      { id: "c4-s2", title: "Ancient Egypt", type: "reading", completed: true },
      { id: "c4-s3", title: "The Indus Valley", type: "video", completed: true },
      { id: "c4-s4", title: "Practice Quiz: Early Civilizations", type: "quiz", completed: true },
      { id: "c4-s5", title: "Comparative Essay Assignment", type: "assignment", completed: true },
    ],
  },
  {
    id: "course-5",
    title: "Geometry Essentials",
    category: "Mathematics",
    instructor: "Ms. Harper",
    status: "archived",
    steps: [
      { id: "c5-s1", title: "Angles & Triangles", type: "video", completed: true },
      { id: "c5-s2", title: "Area and Perimeter", type: "reading", completed: false },
      { id: "c5-s3", title: "Practice Quiz: Shapes", type: "quiz", completed: false },
    ],
  },
];
