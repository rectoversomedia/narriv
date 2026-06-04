const fs = require('fs');
const file = 'C:\\\\MyProject\\\\narriv\\\\frontend\\\\app\\\\onboarding\\\\page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('OnboardingContext')) {
// 1. Imports
const imports = `import { useRouter } from "next/navigation";
import { createContext, useContext } from "react";
import { createOnboardingWorkspace, createOnboardingSources, createOnboardingNotifications, createOnboardingTeam } from "@/lib/api-service";
`;
content = content.replace('import { useState, useEffect, startTransition, type ReactNode } from "react";', 'import { useState, useEffect, startTransition, type ReactNode } from "react";\n' + imports);

// 2. Define Context and FormData
const contextCode = `
type OnboardingFormData = {
  profile: { brandName: string; industry: string; timezone: string };
  sources: Array<{ name: string; type: string }>;
  notifications: { emailEnabled: boolean; whatsappEnabled: boolean; escalationNotifications: boolean; reminderNotifications: boolean };
  team: Array<{ email: string; role: string }>;
};

const OnboardingContext = createContext<{
  formData: OnboardingFormData;
  updateForm: (section: keyof OnboardingFormData, data: any) => void;
  submitOnboarding: () => Promise<void>;
  isSubmitting: boolean;
} | null>(null);

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingContext");
  return ctx;
}
`;

content = content.replace('type Step = 1 | 2 | 3 | 4 | 5;', contextCode + '\ntype Step = 1 | 2 | 3 | 4 | 5;');

// 3. Add state and provider in OnboardingPage
const providerStart = `
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<OnboardingFormData>({
    profile: { brandName: "Narriv Workspace", industry: "Technology", timezone: "Asia/Jakarta" },
    sources: [{ name: "Twitter Official", type: "twitter" }],
    notifications: { emailEnabled: true, whatsappEnabled: false, escalationNotifications: true, reminderNotifications: true },
    team: []
  });

  const updateForm = (section: keyof OnboardingFormData, data: any) => {
    setFormData(prev => ({ ...prev, [section]: data }));
  };

  const submitOnboarding = async () => {
    setIsSubmitting(true);
    try {
      const workspace = await createOnboardingWorkspace(formData.profile);
      if (workspace && workspace.id) {
        if (formData.sources.length > 0) {
          await createOnboardingSources({ workspaceId: workspace.id, sources: formData.sources });
        }
        await createOnboardingNotifications({ workspaceId: workspace.id, ...formData.notifications });
        if (formData.team.length > 0) {
          await createOnboardingTeam({ workspaceId: workspace.id, members: formData.team });
        }
        // Redirect to dashboard
        router.push("/");
      } else {
        setIsSubmitting(false);
        setStep(5); // Go back to preview if failed
      }
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
      setStep(5);
    }
  };

  return (
    <OnboardingContext.Provider value={{ formData, updateForm, submitOnboarding, isSubmitting }}>
`;
content = content.replace('return (\n    <div className="min-h-screen bg-background', providerStart + '    <div className="min-h-screen bg-background');
content = content.replace('</main>\n      </div>\n    </div>\n  );\n}', '</main>\n      </div>\n    </div>\n    </OnboardingContext.Provider>\n  );\n}');

// 4. Update ProcessingScreen to call submitOnboarding
content = content.replace('function ProcessingScreen() {', 'function ProcessingScreen() {\n  const { submitOnboarding } = useOnboarding();\n  useEffect(() => { submitOnboarding(); }, []);\n');

fs.writeFileSync(file, content, 'utf8');
console.log('Patched top-level');
}
