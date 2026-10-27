"use client";

import { Progress } from "@/components/ui/progress";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import { Logo } from "../ui/Logo";

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  goPrevious?: () => void;
  user?: string;
}

export default function OnboardingProgressBar({
  currentStep,
  totalSteps,
  stepName,
  goPrevious = () => {},
  user = "",
}: OnboardingProgressBarProps) {
  const progressValue = (currentStep / totalSteps) * 100;

  return (
    <>
      <header className="py-6 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={goPrevious}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo />
          </div>
          {user && (
            <div className="flex items-center justify-end">
              <span>Welcome, {user}</span>
            </div>
          )}
        </div>
      </header>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">{stepName}</span>
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>
    </>
  );
}
