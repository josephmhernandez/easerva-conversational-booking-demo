"use client";

import OnboardingProgressBar from "@/components/onboarding/OnboardingProgressBar";

interface CalendarIntegrationHeaderProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  stepName: string;
  goPrevious?: () => void;
  user?: string;
}

export default function CalendarIntegrationHeader({
  currentStep,
  totalSteps,
  title,
  subtitle,
  stepName,
  goPrevious,
  user,
}: CalendarIntegrationHeaderProps) {
  return (
    <div className="mb-8">
      <OnboardingProgressBar
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepName={stepName}
        goPrevious={goPrevious}
        user={user}
      />
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-lg text-gray-600 mb-4">{subtitle}</p>
        <p className="text-sm text-gray-500">
          Configure calendar integration for your booking system
        </p>
      </div>
    </div>
  );
}
