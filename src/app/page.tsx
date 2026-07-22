import { notFound } from "next/navigation";

// Die Startseite gibt es bewusst nicht: Zugriff nur ueber die geheimen Links.
export default function Home() {
  notFound();
}
