import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { MovingFeatures } from "@/components/moving-features"
import { ServiceCards } from "@/components/service-cards"
import { SafetySection } from "@/components/safety-section"
import { FAQSection } from "@/components/faq-section"
import { Testimonials } from "@/components/testimonials"
import { Footer } from "@/components/footer"
import { NHSPopup } from "@/components/nhs-popup"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <MovingFeatures />
      <ServiceCards />
      <SafetySection />
      <Testimonials />
      <FAQSection />
      <NHSPopup />
    </div>
  )
}
