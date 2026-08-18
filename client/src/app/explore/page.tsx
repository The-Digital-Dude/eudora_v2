import type { Metadata } from "next";

import { CoursesSearchContent } from "./courses-search-content";

export const metadata: Metadata = {
  title: "Explore Courses",
  alternates: { canonical: "/explore" },
};

export default function CoursesPage() {
  return <CoursesSearchContent />;
}
