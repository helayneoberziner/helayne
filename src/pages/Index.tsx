import HeroSection from "@/components/portfolio/HeroSection";
import AboutSection from "@/components/portfolio/AboutSection";
import ServicesSection from "@/components/portfolio/ServicesSection";
import ProcessSection from "@/components/portfolio/ProcessSection";
import VideoPortfolioSection from "@/components/portfolio/VideoPortfolioSection";
import PhotoPortfolioSection from "@/components/portfolio/PhotoPortfolioSection";
import TargetAudienceSection from "@/components/portfolio/TargetAudienceSection";
import DifferentialsSection from "@/components/portfolio/DifferentialsSection";
import ContactSection from "@/components/portfolio/ContactSection";
import Footer from "@/components/portfolio/Footer";

const Index = () => {
  return (
    <div className="min-h-screen scroll-smooth">
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <ProcessSection />
      <VideoPortfolioSection />
      <PhotoPortfolioSection />
      <TargetAudienceSection />
      <DifferentialsSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
