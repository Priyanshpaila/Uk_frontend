"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"

export function NHSPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    const hasOptedOut = localStorage.getItem("nhsPopupOptOut")
    if (hasOptedOut) return

    const timer = setTimeout(() => {
      setIsOpen(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsOpen(false)
    if (dontShowAgain) {
      localStorage.setItem("nhsPopupOptOut", "true")
    }
  }

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Subscribed with email:", email)
    handleClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="h-6 w-6" />
        </button>

        {/* NHS Logo + Title */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-400 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-white rounded-full flex items-center justify-center">
            <img
              src="/nhs-logo-blue-medical-cross-healthcare-symbol.jpg"
              alt="NHS Logo"
              className="w-12 h-12"
            />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Get your NHS Repeat Prescriptions
          </h2>
          <p className="text-blue-100 text-lg font-semibold">
            delivered by us!
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 mb-6 text-center">
            We deliver all over Wakefield and the rest of the UK! Register now
            for convenient NHS prescription delivery.
          </p>

          {/* Register button */}
          <div className="text-center mb-6">
            <a
              href="/auth?from=nhs&next=/account"
              className="block w-full bg-blue-400 hover:bg-blue-1000 text-white font-semibold py-3 rounded-lg text-center"
            >
              Register Now for NHS Services
            </a>
          </div>

          {/* Subscribe form */}
          <form onSubmit={handleSubscribe} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {/* Subscribe button */}
            <Button
              type="submit"
              className="w-full bg-[#00d1b2] hover:bg-[#00b8a0] text-white font-semibold py-3"
            >
              Subscribe for Offers
            </Button>
          </form>

          {/* Don't show again */}
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="dontShow"
              checked={dontShowAgain}
              onCheckedChange={(checked) =>
                setDontShowAgain(checked as boolean)
              }
            />
            <label htmlFor="dontShow" className="text-sm text-gray-600">
              Don't show this popup again
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
