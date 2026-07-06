import { SessionLoader } from "@/components/SessionLoader";

export default function SnackPage() {
  return <SessionLoader mode={{ kind: "snack" }} title="Daily Snack" />;
}
