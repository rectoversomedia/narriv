export type DemoUser = {
  name: string;
  email: string;
  provider: "password" | "google";
  workspace: string;
};

export const DEMO_TOKEN = "demo-token";

function nameFromEmail(email: string) {
  const localPart = email.split("@")[0] || "demo user";
  return localPart
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Demo User";
}

export function createPasswordDemoSession(email: string): DemoUser {
  return {
    name: nameFromEmail(email),
    email,
    provider: "password",
    workspace: "Narriv Demo Workspace",
  };
}

export function createGoogleDemoSession(): DemoUser {
  return {
    name: "Aldi Workspace",
    email: "aldi@workspace.example",
    provider: "google",
    workspace: "Google Workspace Demo",
  };
}
