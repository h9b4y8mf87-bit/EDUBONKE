import { requireChatGPTUser } from "../chatgpt-auth";
import PortalClient from "./portal-client";
import "./portal.css";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const user = await requireChatGPTUser("/portal");
  return <PortalClient initialUser={{ displayName: user.displayName, email: user.email }} />;
}
