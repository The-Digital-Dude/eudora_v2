import { redirect } from "next/navigation";

/** The catalog moved inside the portal shell; /learn/* keeps only the focus-mode player. */
export default function LearnRedirect() {
  redirect("/learning");
}
