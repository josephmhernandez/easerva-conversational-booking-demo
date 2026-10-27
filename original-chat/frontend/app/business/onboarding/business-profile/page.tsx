"use client";

import type React from "react";

import OnboardingProgressBar from "@/components/onboarding/OnboardingProgressBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Plus, RefreshCw, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getCanonicalBusinessCategoryNames } from "../../../constants/businessCategories";
import { TAG_SUGGESTIONS } from "../../../constants/businessConstants";
import {
  businessProfilePage,
  goNext,
  goPrevious,
  ROUTE_DASHBOARD,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import { useAuthCore } from "../../../hooks/useAuthCore";
import { getStepInfo } from "../../../utils/onboardingSteps";
import { buildAuthUrl, getCurrentPath } from "../../../utils/auth/redirect";

interface BusinessData {
  name: string;
  category: string;
  customCategory: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  logo?: File | null;
  tags: string[];
  slug: string;
  logoUrl?: string | null;
}

const CANONICAL_BUSINESS_CATEGORY_NAMES = getCanonicalBusinessCategoryNames();

export default function BusinessProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthCore();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // const [, setIsValidatingSlug] = useState(false);
  // const [slugError, setSlugError] = useState("");
  const [isEditingSlug] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState<BusinessData>({
    name: "",
    category: "",
    customCategory: "",
    description: "",
    phone: "",
    email: user?.email || "", // Pre-filled from previous step
    website: "",
    logo: null,
    tags: [],
    slug: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);

  // Auto-generate slug from business name
  useEffect(() => {
    if (formData.name && !isEditingSlug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.name, isEditingSlug]);

  // Add this inside your component
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const response = await fetch("/api/business/onboarding/draft");
        if (response.ok) {
          const { draft } = await response.json();

          if (draft?.draft_data?.business_info) {
            const savedData = draft.draft_data.business_info;

            // Has the logoUrl? If so, set the logoUrl to the logoUrl
            // Load the logo from the logoUrl
            let savedLogoUrl = null;
            let savedLogo = null;
            if (savedData.logoUrl) {
              savedLogo = savedData.logoUrl;
              try {
                const logoResponse = await fetch(savedData.logoUrl);
                const logoBlob = await logoResponse.blob();
                const logoFile = new File([logoBlob], "logo.png", { type: "image/png" });
                savedLogoUrl = savedData.logoUrl;
                savedLogo = logoFile;

                const reader = new FileReader();
                reader.onload = (e) => {
                  setLogoPreview(e.target?.result as string);
                };
                reader.readAsDataURL(logoFile);
              } catch (error) {
                console.error("Failed to load logo:", error);
              }
            }

            setFormData({
              name: savedData.name || "",
              category: savedData.category || "",
              customCategory: savedData.customCategory || "",
              description: savedData.description || "",
              phone: savedData.phone || "",
              email: savedData.email || user?.email || "",
              website: savedData.website || "",
              logo: savedLogo, // Files can't be persisted this way
              logoUrl: savedLogoUrl,
              tags: savedData.tags || [],
              slug: savedData.slug || "",
            });

            // Store businessId for later use
            if (draft.business_id) {
              localStorage.setItem("onboarding_business_id", draft.business_id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load draft:", error);
      }
    };

    if (user) {
      loadDraft();
    }
  }, [user]);

  // Auto-save function
  const handleAutoSave = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    try {
      console.log("Data to save:", formData);
      const stepData = {
        name: formData.name,
        category: formData.category,
        customCategory: formData.customCategory,
        description: formData.description,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        tags: formData.tags,
        slug: formData.slug,
        logoUrl: formData?.logoUrl || null,
      };

      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: "business_info",
          stepData,
          currentStep: "business_info",
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        alert(error?.error || "Failed to save draft");
        throw new Error(error?.error || "Failed to save draft");
      }

      const data = await response.json();

      setLastSaved(new Date());
      setHasUnsavedChanges(false);

      // Store businessId in localStorage or state management for later steps
      if (data.businessId) {
        localStorage.setItem("onboarding_business_id", data.businessId);
      }

      return true;
    } catch (error) {
      console.error("Auto-save failed:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [formData]);

  const handleInputChange = (field: keyof BusinessData, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);

    // Clear errors for the field being edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleTagAdd = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmedTag] }));
      setHasUnsavedChanges(true);
    }
    setTagInput("");
    setShowTagSuggestions(false);
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
    setHasUnsavedChanges(true);
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (tagInput.trim()) {
        handleTagAdd(tagInput);
      }
    }
  };

  const getFilteredTagSuggestions = () => {
    const categoryTags = TAG_SUGGESTIONS[formData.category] || [];
    return categoryTags.filter(
      (tag) =>
        tag.toLowerCase().includes(tagInput.toLowerCase()) &&
        !formData.tags.includes(tag.toLowerCase())
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Business name is required";
    }

    if (!formData.category) {
      newErrors.category = "Please select a business category";
    }

    if (formData.category === "Other" && !formData.customCategory.trim()) {
      newErrors.customCategory = "Please specify your business category";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Business phone number is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Business email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.website.trim()) {
      newErrors.website = "Business website is required";
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Please enter a valid website URL (include http:// or https://)";
    }

    setErrors(newErrors);
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      const firstError = Object.keys(errors)[0];
      if (firstError) {
        const errorElement = document.getElementById(firstError);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: "smooth" });
        }
      }
      return;
    }

    setIsSaving(true);
    const saveSuccess = await handleAutoSave();
    setIsSaving(false);

    if (saveSuccess) {
      router.push(goNext(businessProfilePage)?.pageRef ?? "");
    }
    // If save fails, user stays on page (alert already shown)
  };

  const handleSaveAndExit = async () => {
    const saveSuccess = await handleAutoSave();
    if (saveSuccess) {
      router.push(ROUTE_DASHBOARD);
    }
    // If save fails, user stays on page (alert already shown)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        {/* Progress Indicator */}
        <OnboardingProgressBar
          currentStep={getStepInfo("business-profile").currentStep}
          totalSteps={getStepInfo("business-profile").totalSteps}
          stepName={getStepInfo("business-profile").stepName}
          user={user?.email}
          goPrevious={() => router.push(goPrevious(businessProfilePage)?.pageRef ?? "")}
        />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Tell us about your business</h1>
          <p className="text-lg text-gray-600">
            Help customers find and understand your services with a complete business profile.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-8">
              {/* Business Name */}
              <div>
                <label
                  htmlFor="businessName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Business Name *
                </label>
                <Input
                  id="businessName"
                  placeholder="Enter your business name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={`h-12 text-base ${errors.name ? "border-red-300" : ""}`}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.name}
                  </p>
                )}

                {/* URL Slug */}
                {/* {formData.name && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Your booking URL:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingSlug(!isEditingSlug)}
                        className="text-orange-500 hover:text-orange-600"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">easerva.com/</span>
                      {isEditingSlug ? (
                        <Input
                          value={formData.slug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          className="flex-1 h-8 text-sm"
                          placeholder="your-business-name"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{formData.slug}</span>
                      )}
                      {isValidatingSlug && (
                        <LoadingSpinner size="sm" />
                      )}
                      {formData.slug && !isValidatingSlug && !slugError && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    {slugError && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {slugError}
                      </p>
                    )}
                  </div>
                )} */}
              </div>

              {/* Business Category */}
              <div>
                <label
                  id="category"
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Business Category *
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange("category", value)}
                >
                  <SelectTrigger className={`h-12 ${errors.category ? "border-red-300" : ""}`}>
                    <SelectValue placeholder="Select your business category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANONICAL_BUSINESS_CATEGORY_NAMES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.category}
                  </p>
                )}

                {/* Custom Category */}
                {formData.category === "Other" && (
                  <div id="customCategory" className="mt-3">
                    <Input
                      placeholder="Please specify your business category"
                      value={formData.customCategory}
                      onChange={(e) => handleInputChange("customCategory", e.target.value)}
                      className={`h-12 text-base ${errors.customCategory ? "border-red-300" : ""}`}
                    />
                    {errors.customCategory && (
                      <p className="text-red-500 text-sm mt-1 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.customCategory}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Business Description */}
              <div>
                <label
                  id="description"
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Business Description <span className="text-gray-400">(optional)</span>
                </label>
                <Textarea
                  id="description"
                  placeholder="Tell customers about your business, services, and what makes you special..."
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="min-h-[100px] text-base resize-none"
                  maxLength={500}
                />
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    Help customers understand what you offer and why they should choose you
                  </span>
                  <span className="text-xs text-gray-500">{formData.description.length}/500</span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Phone */}
                <div>
                  <label
                    id="phone"
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Business Phone *
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className={`h-12 text-base ${errors.phone ? "border-red-300" : ""}`}
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label
                    id="email"
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Business Email *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="business@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className={`h-12 text-base ${errors.email ? "border-red-300" : ""}`}
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Website */}
              <div>
                <label
                  id="website"
                  htmlFor="website"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Website *
                </label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://www.yourbusiness.com"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  className={`h-12 text-base ${errors.website ? "border-red-300" : ""}`}
                />
                {errors.website && (
                  <p className="text-red-500 text-sm mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.website}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags <span className="text-gray-400">(optional)</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Add tags to help customers find your core services. Please also include other
                  names that your customers might know you by. Tags will be reviewed by our team
                  before they are searchable to customers.
                </p>

                {/* Tag Input */}
                <div className="relative">
                  <Input
                    placeholder="Add tags (press Enter or comma to add)"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(e.target.value.length > 0);
                    }}
                    onKeyDown={handleTagInputKeyDown}
                    onFocus={() => setShowTagSuggestions(tagInput.length > 0)}
                    className="h-12 text-base"
                  />

                  {/* Tag Suggestions */}
                  {showTagSuggestions && formData.category && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {getFilteredTagSuggestions().map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleTagAdd(suggestion)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                        >
                          <Plus className="w-4 h-4 mr-2 text-gray-400" />
                          {suggestion}
                        </button>
                      ))}
                      {tagInput &&
                        !getFilteredTagSuggestions().includes(tagInput.toLowerCase()) && (
                          <button
                            onClick={() => handleTagAdd(tagInput)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center border-t border-gray-100"
                          >
                            <Plus className="w-4 h-4 mr-2 text-gray-400" />
                            Add &quot;{tagInput}&quot;
                          </button>
                        )}
                    </div>
                  )}
                </div>

                {/* Selected Tags */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {formData.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer"
                        onClick={() => handleTagRemove(tag)}
                      >
                        {tag}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndExit}
                disabled={isSaving}
                className="border-gray-200 hover:bg-gray-50 bg-transparent"
                loading={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                Save and Exit
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isSaving}
                className="px-8"
                loading={isSaving}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
