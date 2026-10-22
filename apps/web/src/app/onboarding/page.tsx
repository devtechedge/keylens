import { Header } from "@/components/ui/Header";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Onboarding · KeyLens",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen">
      <Header
        brand="KeyLens onboarding"
        nav={[{ href: "/", label: "Dashboard" }]}
      />
      <main className="py-10">
        <OnboardingFlow />
      </main>
    </div>
  );
}
