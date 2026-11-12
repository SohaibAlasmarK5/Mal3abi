import { notFound } from "next/navigation";

/** Any address that matches no page shows the 404 inside the site frame, in the right language. */
export default function CatchAll() {
  notFound();
}
