"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"

const faqs = [
  {
    question: "Why are weight loss treatment prices changing?",
    answer:
      "Treatment prices may vary due to changes in medication costs, regulatory requirements, and market conditions. We always strive to offer competitive pricing while maintaining the highest quality standards.",
  },
  {
    question: "Can I switch weight loss treatments?",
    answer:
      "Yes, you can discuss switching treatments with our clinical team during your consultation. We'll assess your current progress and medical history to recommend the most suitable alternative if needed.",
  },
  {
    question: "What is Pharmacy Express?",
    answer:
      "Pharmacy Express is a UK-licensed online pharmacy providing convenient access to prescription medications, health consultations, and wellness products. We're regulated by the GPhC and committed to safe, professional healthcare delivery.",
  },
  {
    question: "How does the process work?",
    answer:
      "Simply complete our online consultation form, which is reviewed by our qualified clinicians. If approved, your prescription is dispensed by our registered pharmacy and delivered discreetly to your door.",
  },
  {
    question: "Is my information safe?",
    answer:
      "Absolutely. We use advanced encryption and follow strict data protection regulations (GDPR). Your personal and medical information is kept completely confidential and secure.",
  },
  {
    question: "Will my delivery be discreet?",
    answer:
      "Yes, all orders are sent in plain, unmarked packaging with no indication of the contents. Your privacy is our priority, and deliveries are completely discreet.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold text-gray-900 tracking-tight mb-4">Frequently Asked Questions</h2>
          <div className="w-24 h-1 bg-gray-200 mx-auto"></div>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-200">
              <button
                onClick={() => toggleFAQ(index)}
                aria-expanded={openIndex === index}
                aria-controls={`faq-panel-${index}`}
                className="w-full px-4 sm:px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 rounded-lg focus:outline-none focus-visible:ring focus-visible:ring-gray-300"
              >
                <h3 className="text-base sm:text-lg text-gray-900 pr-6 leading-6 font-medium">{faq.question}</h3>
                <div className="flex-shrink-0">
                  {openIndex === index ? (
                    <Minus className="h-5 w-5 text-gray-500" />
                  ) : (
                    <Plus className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </button>

              {openIndex === index && (
                <div id={`faq-panel-${index}`} className="px-4 sm:px-6 pb-6">
                  <p className="text-gray-700 leading-7">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">
            More questions?{" "}
            <a href="#" className="text-gray-900 hover:text-gray-700 font-medium underline">
              Visit our help centre
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
