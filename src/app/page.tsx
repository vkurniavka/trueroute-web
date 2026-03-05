import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { RequirementsSection } from "@/components/RequirementsSection";
import { DownloadCTASection } from "@/components/DownloadCTASection";

export default function Home() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <RequirementsSection />
      <DownloadCTASection />
    </>
  );
}
