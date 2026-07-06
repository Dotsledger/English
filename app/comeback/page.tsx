import { SessionLoader } from "@/components/SessionLoader";

export default function ComebackPage() {
  return <SessionLoader mode={{ kind: "comeback" }} title="Bienvenido de vuelta" />;
}
