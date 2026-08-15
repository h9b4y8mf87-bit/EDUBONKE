import type { Metadata } from "next";
import PortalClient from "../portal/portal-client";
import "../portal/portal.css";

export const metadata: Metadata = {
  title: "Interactive Demo | EduBonke",
  description: "Explore EduBonke with clearly labelled synthetic South African college data. No account or backend setup is required.",
};

export default function DemoPage() {
  return <PortalClient demoMode />;
}
