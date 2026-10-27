"use client";

import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { Button } from "../../../../../components/ui/button";

interface BottomActionBarProps {
  isSaving: boolean;
  isRoutingPrevious: boolean;
  areAllRequirementsConfigured: boolean;
  onSave: () => Promise<void>;
  onContinue: () => Promise<void>;
  onBack: () => void;
}

export default function BottomActionBar({
  isSaving,
  isRoutingPrevious,
  areAllRequirementsConfigured,
  onSave,
  onContinue,
  onBack,
}: BottomActionBarProps) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="flex items-center gap-2 bg-transparent"
            onClick={onBack}
            disabled={isSaving}
            data-testid="back-btn"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving || isRoutingPrevious}
            loading={isSaving}
            data-testid="save-draft-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          {!areAllRequirementsConfigured && (
            <div className="text-sm text-red-600 mr-2" data-testid="validation-message">
              Assign at least one default booking calendar to continue
            </div>
          )}
          <Button
            variant="primary"
            onClick={onContinue}
            disabled={!areAllRequirementsConfigured || isSaving || isRoutingPrevious}
            loading={isSaving}
            data-testid="continue-btn"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
