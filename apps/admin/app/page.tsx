import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to login for now (will check auth later)
  redirect("/login");
}