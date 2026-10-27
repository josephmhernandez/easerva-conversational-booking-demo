"use client";

import type React from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Note } from "@/components/ui/note";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Car,
  Clock,
  Copy,
  DollarSign,
  Edit,
  GripVertical,
  HelpCircle,
  Info,
  Monitor,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingProgressBar from "../../../../components/onboarding/OnboardingProgressBar";
import {
  BUSINESS_CATEGORIES,
  OnboardingStep,
  SERVICE_ANSWER_TYPES,
  SERVICE_DURATION_OPTIONS,
} from "../../../constants/businessConstants";
import {
  businessServiceTemplatesPage,
  goNext,
  goPrevious,
  ROUTE_LOGIN_PAGE,
} from "../../../constants/routeConstants";
import type { ServiceQuestion, ValidationConfig } from "../../../types/businessTypes";
import { getStepInfo } from "../../../utils/onboardingSteps";
import { useAuthCore } from "@/app/hooks/useAuthCore";
import { buildAuthUrl, getCurrentPath } from "@/app/utils/auth/redirect";

interface ServiceTemplate {
  id: string;
  name: string;
  category: string;
  customCategory?: string;
  duration: string | number;
  price: number;
  priceType: "fixed" | "variable";
  priceMin?: number;
  priceMax?: number;
  description: string;
  searchKeywords: string[];
  deliveryOptions: {
    inPerson: boolean;
    mobile: boolean;
    virtual: boolean;
  };
  questions: ServiceQuestion[];
  qualificationQuestions: ServiceQuestion[];
}

export default function BusinessServiceTemplatesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceTemplate[]>([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState<ServiceTemplate | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRoutingPrevious, setIsRoutingPrevious] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ServiceQuestion | undefined>();
  const [questionType, setQuestionType] = useState<"pre-booking" | "qualification">("pre-booking");
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [deliveryAvailability, setDeliveryAvailability] = useState({
    inPerson: false,
    mobile: false,
    virtual: false,
  });
  const getEmptyFormData = () => ({
    name: "",
    category: "",
    customCategory: "",
    duration: "60",
    price: 0,
    priceType: "fixed" as "fixed" | "variable",
    priceMin: 0,
    priceMax: 0,
    description: "",
    searchKeywords: [] as string[],
    searchKeywordsInput: "",
    deliveryOptions: {
      inPerson: false,
      mobile: false,
      virtual: false,
    },
    questions: [] as ServiceQuestion[],
    qualificationQuestions: [] as ServiceQuestion[],
    noPreBookingQuestions: false,
    noQualificationQuestions: false,
  });
  const [activeTab, setActiveTab] = useState("basic");
  const [preBookingCheckboxError, setPreBookingCheckboxError] = useState(false);
  const [qualificationCheckboxError, setQualificationCheckboxError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [customCategoryError, setCustomCategoryError] = useState(false);
  const [durationError, setDurationError] = useState(false);
  const [deliveryError, setDeliveryError] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    customCategory: "",
    duration: "60",
    price: 0,
    priceType: "fixed" as "fixed" | "variable",
    priceMin: 0,
    priceMax: 0,
    description: "",
    searchKeywords: [] as string[],
    searchKeywordsInput: "",
    deliveryOptions: {
      inPerson: true,
      mobile: false,
      virtual: false,
    },
    questions: [] as ServiceQuestion[],
    qualificationQuestions: [] as ServiceQuestion[],
    noPreBookingQuestions: false,
    noQualificationQuestions: false,
  });
  const { user, loading: authLoading } = useAuthCore();
  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (!authLoading && !user) {
      const currentPath = getCurrentPath();
      router.push(buildAuthUrl(ROUTE_LOGIN_PAGE, currentPath));
    }
  }, [authLoading, user, router]);

  // Load draft data on initial load
  useEffect(() => {
    const loadDraftData = async () => {
      setIsLoading(true);
      try {
        const [servicesDraftRes, locationDraftRes] = await Promise.all([
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_SERVICE_TEMPLATES}`),
          fetch(`/api/business/onboarding/draft/${OnboardingStep.BUSINESS_LOCATION}`), // business_location
        ]);

        if (servicesDraftRes.ok) {
          const { draftData } = await servicesDraftRes.json();
          console.log("Loaded draft service templates data:", draftData);

          if (draftData && draftData.services && Array.isArray(draftData.services)) {
            setServices(draftData.services);
          }
        } else {
          console.log("No draft data found or response not ok");
        }

        if (locationDraftRes.ok) {
          const { draftData: locationDraft } = await locationDraftRes.json();
          const hasMobile = Boolean(locationDraft?.["serviceTypes.mobile"]);
          const hasVirtual = Boolean(locationDraft?.["serviceTypes.virtual"]);
          const hasPhysical = Boolean(locationDraft?.["serviceTypes.physical"]);
          setDeliveryAvailability({
            inPerson: hasPhysical,
            mobile: hasMobile,
            virtual: hasVirtual,
          });
        } else {
          setDeliveryAvailability({ inPerson: false, mobile: false, virtual: false });
        }
      } catch (error) {
        console.error("Error loading draft service templates data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraftData();
  }, []);

  useEffect(() => {
    if (editingService) {
      setFormData({
        name: editingService.name,
        category: editingService.category,
        customCategory: editingService.customCategory || "",
        duration: editingService.duration.toString(),
        price: editingService.price,
        priceType: editingService.priceType || "fixed",
        priceMin: editingService.priceMin || 0,
        priceMax: editingService.priceMax || 0,
        description: editingService.description,
        searchKeywords: editingService.searchKeywords || [],
        searchKeywordsInput: (editingService.searchKeywords || []).join(", "),
        deliveryOptions: editingService.deliveryOptions,
        questions: editingService.questions,
        qualificationQuestions: editingService.qualificationQuestions || [],
        noPreBookingQuestions: editingService.questions.length === 0,
        noQualificationQuestions: (editingService.qualificationQuestions || []).length === 0,
      });
      setNameError(false);
      setCategoryError(false);
      setCustomCategoryError(false);
      setDurationError(false);
      setDeliveryError(false);
    } else {
      setFormData({
        name: "",
        category: "",
        customCategory: "",
        duration: "60",
        price: 0,
        priceType: "fixed",
        priceMin: 0,
        priceMax: 0,
        description: "",
        searchKeywords: [],
        searchKeywordsInput: "",
        deliveryOptions: {
          inPerson: false,
          mobile: false,
          virtual: false,
        },
        questions: [],
        qualificationQuestions: [],
        noPreBookingQuestions: false,
        noQualificationQuestions: false,
      });
      setNameError(false);
      setCategoryError(false);
      setCustomCategoryError(false);
      setDurationError(false);
      setDeliveryError(false);
    }
  }, [editingService]);

  const handleInputChange = (field: string, value: string | number | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearchKeywordsChange = (value: string) => {
    const parsedKeywords = value
      .split(",")
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword.length > 0);

    const limitedKeywords = parsedKeywords.slice(0, 25);
    const overLimit = parsedKeywords.length > 25;

    setFormData((prev) => ({
      ...prev,
      searchKeywordsInput: overLimit ? limitedKeywords.join(", ") : value,
      searchKeywords: limitedKeywords,
    }));
  };

  const handleDeliveryOptionChange = (option: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      deliveryOptions: {
        ...prev.deliveryOptions,
        [option]: checked,
      },
    }));
  };

  const handleAddQuestion = (type: "pre-booking" | "qualification") => {
    setQuestionType(type);
    setEditingQuestion(undefined);
    setShowQuestionForm(true);
    if (type === "pre-booking") setPreBookingCheckboxError(false);
    if (type === "qualification") setQualificationCheckboxError(false);
  };

  const handleEditQuestion = (question: ServiceQuestion, type: "pre-booking" | "qualification") => {
    setQuestionType(type);
    setEditingQuestion(question);
    setShowQuestionForm(true);
  };

  const handleSaveQuestion = (question: ServiceQuestion) => {
    setFormData((prev) => {
      const targetQuestions =
        questionType === "pre-booking" ? "questions" : "qualificationQuestions";
      const existingIndex = prev[targetQuestions].findIndex((q) => q.id === question.id);

      if (existingIndex >= 0) {
        const newQuestions = [...prev[targetQuestions]];
        newQuestions[existingIndex] = question;
        return { ...prev, [targetQuestions]: newQuestions };
      } else {
        return { ...prev, [targetQuestions]: [...prev[targetQuestions], question] };
      }
    });
    setShowQuestionForm(false);
    setEditingQuestion(undefined);
  };

  const handleCancelQuestion = () => {
    setShowQuestionForm(false);
    setEditingQuestion(undefined);
  };

  const handleRemoveQuestion = (questionId: string, type: "pre-booking" | "qualification") => {
    const targetQuestions = type === "pre-booking" ? "questions" : "qualificationQuestions";
    setFormData((prev) => ({
      ...prev,
      [targetQuestions]: prev[targetQuestions].filter((q) => q.id !== questionId),
    }));
  };

  const handleToggleQuestion = (questionId: string, type: "pre-booking" | "qualification") => {
    const targetQuestions = type === "pre-booking" ? "questions" : "qualificationQuestions";
    setFormData((prev) => ({
      ...prev,
      [targetQuestions]: prev[targetQuestions].map((q) =>
        q.id === questionId ? { ...q, active: !q.active } : q
      ),
    }));
  };

  const handleMoveQuestion = (
    questionId: string,
    direction: "up" | "down",
    type: "pre-booking" | "qualification"
  ) => {
    const targetQuestions = type === "pre-booking" ? "questions" : "qualificationQuestions";
    setFormData((prev) => {
      const questions = [...prev[targetQuestions]];
      const index = questions.findIndex((q) => q.id === questionId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < questions.length) {
        [questions[index], questions[targetIndex]] = [questions[targetIndex], questions[index]];
      }

      return { ...prev, [targetQuestions]: questions };
    });
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      text: "Text",
      textarea: "Long Text",
      number: "Number",
      integer: "Whole Number",
      "single-choice": "Single Choice",
      "multiple-choice": "Multiple Choice",
      phone: "Phone",
      email: "Email",
      website: "Website",
      address: "Address",
      date: "Date",
      datetime: "Date & Time",
      image: "Image Upload",
      document: "Document",
      measurement: "Measurement",
      "yes-no": "Yes/No",
    };
    return typeMap[type] || type;
  };

  const handleSaveService = () => {
    // Reset basic field errors
    setNameError(false);
    setCategoryError(false);
    setCustomCategoryError(false);
    setDurationError(false);
    setDeliveryError(false);

    // Validate basic info
    const errors: string[] = [];

    if (!formData.name.trim()) {
      setNameError(true);
      errors.push("Service name is required.");
    }

    if (!formData.category) {
      setCategoryError(true);
      errors.push("Category/Type is required.");
    }

    if (formData.category === "Other" && !formData.customCategory.trim()) {
      setCustomCategoryError(true);
      errors.push("Please specify your custom category.");
    }

    if (!formData.duration || formData.duration.trim() === "") {
      setDurationError(true);
      errors.push("Base duration is required.");
    }

    // Require at least one delivery option if any are available
    const availableOptions = [
      deliveryAvailability.inPerson ? formData.deliveryOptions.inPerson : false,
      deliveryAvailability.mobile ? formData.deliveryOptions.mobile : false,
      deliveryAvailability.virtual ? formData.deliveryOptions.virtual : false,
    ];
    const anyAvailable =
      deliveryAvailability.inPerson || deliveryAvailability.mobile || deliveryAvailability.virtual;
    const anySelected = availableOptions.some(Boolean);
    if (anyAvailable && !anySelected) {
      setDeliveryError(true);
      errors.push("Select at least one service delivery option.");
    }

    if (errors.length > 0) {
      setActiveTab("basic");

      // Scroll to the appropriate field based on the error
      setTimeout(() => {
        let targetElement = null;

        if (customCategoryError) {
          // Scroll to custom category field
          targetElement = document.getElementById("customCategory");
        } else if (deliveryError || (anyAvailable && !anySelected)) {
          // Scroll to delivery options
          targetElement = document.getElementById("service-delivery-options");
        } else if (nameError) {
          // Scroll to name field
          targetElement = document.getElementById("serviceName");
        } else if (categoryError) {
          // Scroll to category field
          targetElement = document.getElementById("categorySelect");
        } else if (durationError) {
          // Scroll to duration field
          targetElement = document.querySelector('select, [role="combobox"]');
        }

        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          // Focus the element if it's an input
          if (targetElement instanceof HTMLInputElement) {
            targetElement.focus();
          }
        }
      }, 100);

      return;
    }

    // Validate qualification questions requirement first
    const hasActiveQualification = formData.qualificationQuestions.some(
      (q) => q.text.trim() && q.active
    );
    if (!formData.noQualificationQuestions && !hasActiveQualification) {
      setActiveTab("qualification");
      setQualificationCheckboxError(true);
      alert(
        "Please either add at least one active qualification question or check 'No qualification screening required' in the Qualification Questions tab."
      );
      return;
    }

    // Validate pre-booking questions requirement
    const hasActiveQuestions = formData.questions.some((q) => q.text.trim() && q.active);
    if (!formData.noPreBookingQuestions && !hasActiveQuestions) {
      setActiveTab("questions");
      setPreBookingCheckboxError(true);
      alert(
        "Please either add at least one active pre-booking question or check 'No pre-booking questions required' in the Pre-booking Questions tab."
      );
      return;
    }

    const serviceData: ServiceTemplate = {
      id: editingService?.id || Date.now().toString(),
      name: formData.name.trim(),
      category: formData.category,
      customCategory: formData.category === "Other" ? formData.customCategory.trim() : undefined,
      duration: formData.duration,
      price: formData.priceType === "fixed" ? formData.price : 0,
      priceType: formData.priceType,
      priceMin: formData.priceType === "variable" ? formData.priceMin : undefined,
      priceMax: formData.priceType === "variable" ? formData.priceMax : undefined,
      description: formData.description.trim(),
      searchKeywords: formData.searchKeywords,
      deliveryOptions: formData.deliveryOptions,
      questions: formData.noPreBookingQuestions
        ? []
        : formData.questions.filter((q) => q.text.trim()),
      qualificationQuestions: formData.noQualificationQuestions
        ? []
        : formData.qualificationQuestions.filter((q) => q.text.trim()),
    };

    if (editingService) {
      setServices((prev) => prev.map((s) => (s.id === editingService.id ? serviceData : s)));
    } else {
      setServices((prev) => [...prev, serviceData]);
    }

    setShowServiceForm(false);
    setEditingService(null);
  };

  const handleEditService = (service: ServiceTemplate) => {
    setEditingService(service);
    setShowServiceForm(true);
    setActiveTab("basic");
  };

  const handleDuplicateService = (service: ServiceTemplate) => {
    const duplicatedService: ServiceTemplate = {
      ...service,
      id: Date.now().toString(),
      name: `${service.name} (Copy)`,
      priceType: service.priceType || "fixed",
      searchKeywords: service.searchKeywords || [],
      qualificationQuestions: service.qualificationQuestions || [],
    };
    setServices((prev) => [...prev, duplicatedService]);
  };

  const handleDeleteService = (serviceId: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
    }
  };

  const handleDragStart = (e: React.DragEvent, serviceId: string) => {
    setDraggedItem(serviceId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = services.findIndex((s) => s.id === draggedItem);
    const targetIndex = services.findIndex((s) => s.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newServices = [...services];
    const [draggedService] = newServices.splice(draggedIndex, 1);
    newServices.splice(targetIndex, 0, draggedService);

    setServices(newServices);
    setDraggedItem(null);
  };

  const formatDuration = (duration: string | number) => {
    // Handle string values like "8hr+"
    if (typeof duration === "string" && duration.includes("hr+")) {
      return duration;
    }

    const minutes = typeof duration === "string" ? parseInt(duration, 10) : duration;

    if (isNaN(minutes)) {
      return duration.toString();
    }

    if (minutes < 60) {
      return `${minutes}min`;
    } else if (minutes === 60) {
      return "1hr";
    } else if (minutes % 60 === 0) {
      return `${minutes / 60}hr`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}hr ${mins}min`;
    }
  };

  const getDeliveryBadges = (options: ServiceTemplate["deliveryOptions"]) => {
    const badges = [];
    if (options.inPerson)
      badges.push({ icon: Building, text: "In-person", color: "bg-blue-100 text-blue-800" });
    if (options.mobile)
      badges.push({ icon: Car, text: "Mobile", color: "bg-green-100 text-green-800" });
    if (options.virtual)
      badges.push({ icon: Monitor, text: "Virtual", color: "bg-purple-100 text-purple-800" });
    return badges;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dataToSave = {
        services: services,
      };

      console.log("Saving service templates data:", dataToSave);
      const response = await fetch("/api/business/onboarding/draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step: OnboardingStep.BUSINESS_SERVICE_TEMPLATES,
          stepData: dataToSave,
          currentStep: OnboardingStep.BUSINESS_SERVICE_TEMPLATES,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save service templates data");
      }

      console.log("Service templates data saved successfully");
    } catch (error) {
      console.error("Error saving service templates data:", error);
      alert("Failed to save service templates data. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleContinue = async () => {
    if (services.length === 0) {
      alert("Please add at least one service before continuing.");
      return;
    }

    // Save data before continuing
    await handleSave();
    router.push(goNext(businessServiceTemplatesPage)?.pageRef ?? "");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <OnboardingProgressBar
          currentStep={getStepInfo("business-service-templates").currentStep}
          totalSteps={getStepInfo("business-service-templates").totalSteps}
          stepName={getStepInfo("business-service-templates").stepName}
          goPrevious={() => router.push(goPrevious(businessServiceTemplatesPage)?.pageRef ?? "")}
          user={user?.email ?? ""}
        />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-4">What services do you offer?</h1>
          <p className="text-lg text-gray-600">Create all service you want to offer.</p>
          <p className="text-lg text-gray-600">
            Add custom pricing or duration for each location/delivery method in the next step.
          </p>

          {/* Create Service Button */}
          <div className="mt-6">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setEditingService(null);
                setFormData(getEmptyFormData());
                setShowServiceForm(true);
                setActiveTab("basic");
              }}
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Service
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Dialog
            open={showServiceForm}
            onOpenChange={(open) => {
              setShowServiceForm(open);
              if (open) {
                setActiveTab("basic");
                if (!editingService) setFormData(getEmptyFormData());
              }
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingService ? "Edit Service" : "Create Service"}</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <div className="px-6 mt-6">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="qualification">Qualification Questions</TabsTrigger>
                      <TabsTrigger value="questions">Pre-booking Questions</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-6">
                    <TabsContent value="basic" className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Service Name *
                        </label>
                        <Input
                          id="serviceName"
                          placeholder="e.g., Hair Cut & Style"
                          value={formData.name}
                          onChange={(e) => {
                            handleInputChange("name", e.target.value);
                            if (nameError) setNameError(false);
                          }}
                          className={nameError ? "border-red-300" : undefined}
                        />
                        {nameError && (
                          <p className="text-xs text-red-600 mt-1">Service name is required.</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category/Type *
                        </label>
                        <Select
                          value={formData.category}
                          onValueChange={(value) => {
                            handleInputChange("category", value);
                            if (categoryError) setCategoryError(false);
                            if (customCategoryError) setCustomCategoryError(false);
                          }}
                        >
                          <SelectTrigger
                            id="categorySelect"
                            className={categoryError ? "border-red-300" : undefined}
                          >
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {categoryError && (
                          <p className="text-xs text-red-600 mt-1">Category is required.</p>
                        )}

                        {/* Custom Category Input */}
                        {formData.category === "Other" && (
                          <div className="mt-3" id="custom-category-field">
                            <Input
                              id="customCategory"
                              placeholder="Please specify your custom category"
                              value={formData.customCategory}
                              onChange={(e) => {
                                handleInputChange("customCategory", e.target.value);
                                if (customCategoryError) setCustomCategoryError(false);
                              }}
                              className={customCategoryError ? "border-red-300" : undefined}
                            />
                            {customCategoryError && (
                              <p className="text-xs text-red-600 mt-1">
                                Please specify your custom category.
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Base Duration *
                          </label>
                          <Select
                            value={formData.duration}
                            onValueChange={(value) => {
                              handleInputChange("duration", value);
                              if (durationError) setDurationError(false);
                            }}
                          >
                            <SelectTrigger className={durationError ? "border-red-300" : undefined}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SERVICE_DURATION_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {durationError && (
                            <p className="text-xs text-red-600 mt-1">Base duration is required.</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pricing *
                          </label>

                          {/* Price Type Selection */}
                          <div className="space-y-3 mb-3">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="fixed-price"
                                  name="priceType"
                                  checked={formData.priceType === "fixed"}
                                  onChange={() => handleInputChange("priceType", "fixed")}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <label
                                  htmlFor="fixed-price"
                                  className="text-sm font-medium text-gray-700"
                                >
                                  Fixed Price
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="variable-price"
                                  name="priceType"
                                  checked={formData.priceType === "variable"}
                                  onChange={() => handleInputChange("priceType", "variable")}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <label
                                  htmlFor="variable-price"
                                  className="text-sm font-medium text-gray-700"
                                >
                                  Variable Price Range
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Fixed Price Input */}
                          {formData.priceType === "fixed" && (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                $
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.price || ""}
                                onChange={(e) =>
                                  handleInputChange("price", Number.parseFloat(e.target.value) || 0)
                                }
                                className="pl-8"
                              />
                            </div>
                          )}

                          {/* Variable Price Range Inputs */}
                          {formData.priceType === "variable" && (
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Minimum Price
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.priceMin || ""}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "priceMin",
                                        Number.parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="pl-8"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Maximum Price
                                </label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.priceMax || ""}
                                    onChange={(e) =>
                                      handleInputChange(
                                        "priceMax",
                                        Number.parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="pl-8"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {formData.priceType === "variable" && (
                            <p className="text-xs text-gray-500 mt-1">
                              Set a price range for services that vary based on complexity, time, or
                              customization
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Description * <span className="text-gray-400">(500 chars max)</span>
                        </label>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="text-gray-400">
                            This will help customers understand and search for you service. Use the
                            same language as your customer to describe the service.
                          </span>
                        </label>
                        <Textarea
                          placeholder="Brief description of your service..."
                          value={formData.description}
                          onChange={(e) => handleInputChange("description", e.target.value)}
                          maxLength={500}
                          className="resize-none"
                        />
                        <div className="text-right text-xs text-gray-500 mt-1">
                          {formData.description.length}/500
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Searchable Keywords & Phrases{" "}
                          <span className="text-gray-400">(25 keywords max)</span>
                        </label>
                        <p className="text-sm text-gray-600 mb-2">
                          Words and phrases that can help customers find your service
                        </p>
                        <Textarea
                          placeholder="e.g., haircut, styling, blowout, hair treatment, salon, beauty..."
                          value={formData.searchKeywordsInput}
                          onChange={(e) => handleSearchKeywordsChange(e.target.value)}
                          className="resize-none min-h-[80px]"
                        />
                        <div className="flex items-start justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            Separate keywords with commas. These help customers discover your
                            service through search.
                          </p>
                          <span className="text-xs text-gray-400">
                            {formData.searchKeywords.length} keywords
                          </span>
                        </div>
                        {formData.searchKeywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {formData.searchKeywords.map((keyword, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div id="service-delivery-options">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Service Delivery Options *
                        </label>
                        <div
                          className={`space-y-3 ${deliveryError ? "border border-red-300 bg-red-50 rounded-lg p-3" : ""}`}
                        >
                          {deliveryAvailability.inPerson && (
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id="inPerson"
                                checked={formData.deliveryOptions.inPerson}
                                onCheckedChange={(checked) => {
                                  handleDeliveryOptionChange("inPerson", checked as boolean);
                                  if (deliveryError) setDeliveryError(false);
                                }}
                              />
                              <Building className="w-4 h-4 text-gray-500" />
                              <label
                                htmlFor="inPerson"
                                className="text-sm font-medium text-gray-700"
                              >
                                In-person at location
                              </label>
                            </div>
                          )}
                          {deliveryAvailability.mobile && (
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id="mobile"
                                checked={formData.deliveryOptions.mobile}
                                onCheckedChange={(checked) => {
                                  handleDeliveryOptionChange("mobile", checked as boolean);
                                  if (deliveryError) setDeliveryError(false);
                                }}
                              />
                              <Car className="w-4 h-4 text-gray-500" />
                              <label htmlFor="mobile" className="text-sm font-medium text-gray-700">
                                Mobile (go to customer)
                              </label>
                            </div>
                          )}
                          {deliveryAvailability.virtual && (
                            <div className="flex items-center space-x-3">
                              <Checkbox
                                id="virtual"
                                checked={formData.deliveryOptions.virtual}
                                onCheckedChange={(checked) => {
                                  handleDeliveryOptionChange("virtual", checked as boolean);
                                  if (deliveryError) setDeliveryError(false);
                                }}
                              />
                              <Monitor className="w-4 h-4 text-gray-500" />
                              <label
                                htmlFor="virtual"
                                className="text-sm font-medium text-gray-700"
                              >
                                Virtual
                              </label>
                            </div>
                          )}
                          {!deliveryAvailability.inPerson &&
                            !deliveryAvailability.mobile &&
                            !deliveryAvailability.virtual && (
                              <p className="text-sm text-gray-500">
                                No delivery methods configured in Business Locations.
                              </p>
                            )}
                          {deliveryError && (
                            <p className="text-xs text-red-600 mt-2">
                              Select at least one delivery option.
                            </p>
                          )}
                        </div>
                      </div>

                      <Note
                        subheading="This is a template - you'll customize pricing, duration, and availability for each location in the next step."
                        icon={Info}
                        variant="blue"
                      />
                    </TabsContent>

                    <TabsContent value="qualification" className="space-y-6">
                      <Note
                        heading="Important: Qualification Questions"
                        subheading="These questions are used to screen customers and determine if they qualify for your service. For example, if you're a fitness coach who requires a certain level of commitment, you might ask: 'Are you comfortable committing to at least two sessions per week for the next month?' Customers who don't meet your criteria won't be able to book."
                        icon={HelpCircle}
                        variant="blue"
                      />

                      <div
                        className={`border rounded-lg p-4 mb-6 ${
                          qualificationCheckboxError
                            ? "border-red-300 bg-red-50"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="noQualificationQuestions"
                            checked={formData.noQualificationQuestions}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => ({
                                ...prev,
                                noQualificationQuestions: checked as boolean,
                                qualificationQuestions: checked ? [] : prev.qualificationQuestions,
                              }));
                              setQualificationCheckboxError(false);
                            }}
                          />
                          <label
                            htmlFor="noQualificationQuestions"
                            className={`text-sm font-medium cursor-pointer ${
                              qualificationCheckboxError ? "text-red-700" : "text-gray-700"
                            }`}
                          >
                            No qualification screening required for this service
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 ml-6">
                          Check this if any customer can book this service without meeting specific
                          criteria
                        </p>
                        {qualificationCheckboxError && (
                          <p className="text-xs text-red-600 mt-2 ml-6">
                            Required: add an active qualification question or check this box.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            Qualification Questions
                          </h4>
                          <p className="text-sm text-gray-600">
                            Questions used to screen and qualify customers
                          </p>
                        </div>
                        <Button
                          onClick={() => handleAddQuestion("qualification")}
                          size="sm"
                          variant="outline"
                          disabled={formData.noQualificationQuestions}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Question
                        </Button>
                      </div>

                      {formData.noQualificationQuestions ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                          <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 font-medium">
                            No qualification screening required
                          </p>
                          <p className="text-gray-400 text-sm">
                            Any customer can book this service without meeting specific criteria
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Question Form */}
                          {showQuestionForm && questionType === "qualification" && (
                            <Card className="border border-orange-200 bg-orange-50">
                              <CardContent className="p-6">
                                <QuestionForm
                                  question={editingQuestion}
                                  onSave={handleSaveQuestion}
                                  onCancel={handleCancelQuestion}
                                />
                              </CardContent>
                            </Card>
                          )}

                          {/* Existing Questions */}
                          {formData.qualificationQuestions.length === 0 && !showQuestionForm ? (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                              <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">No qualification questions added yet</p>
                              <Button
                                onClick={() => handleAddQuestion("qualification")}
                                size="sm"
                                variant="outline"
                                className="mt-2 bg-transparent"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Question
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {formData.qualificationQuestions.map((question, index) => (
                                <Card key={question.id} className="border border-gray-200">
                                  <CardContent className="p-4">
                                    <div className="flex items-center space-x-3">
                                      <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                          <span className="font-medium text-gray-900 truncate">
                                            {question.text}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs flex-shrink-0"
                                          >
                                            {getTypeLabel(question.type)}
                                          </Badge>
                                          {question.required && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs text-red-600 border-red-200 flex-shrink-0"
                                            >
                                              Required
                                            </Badge>
                                          )}
                                          {!question.active && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs text-gray-500 border-gray-300 flex-shrink-0"
                                            >
                                              Inactive
                                            </Badge>
                                          )}
                                        </div>
                                        {question.businessNotes && (
                                          <p className="text-sm text-gray-500 truncate">
                                            {question.businessNotes}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2 flex-shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleMoveQuestion(question.id, "up", "qualification")
                                          }
                                          disabled={
                                            index === 0 || formData.noQualificationQuestions
                                          }
                                          className="p-1 h-8 w-8"
                                        >
                                          ↑
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleMoveQuestion(question.id, "down", "qualification")
                                          }
                                          disabled={
                                            index === formData.qualificationQuestions.length - 1 ||
                                            formData.noQualificationQuestions
                                          }
                                          className="p-1 h-8 w-8"
                                        >
                                          ↓
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleEditQuestion(question, "qualification")
                                          }
                                          disabled={formData.noQualificationQuestions}
                                          className="p-1 h-8 w-8"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="p-1 h-8 w-8 text-red-600"
                                          disabled={formData.noQualificationQuestions}
                                          onClick={() => {
                                            if (
                                              confirm(
                                                "Are you sure you want to delete this question?"
                                              )
                                            ) {
                                              handleRemoveQuestion(question.id, "qualification");
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Switch
                                          checked={question.active}
                                          onCheckedChange={() =>
                                            handleToggleQuestion(question.id, "qualification")
                                          }
                                          disabled={formData.noQualificationQuestions}
                                        />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="questions" className="space-y-6">
                      <Note
                        heading="Important: Pre-booking Questions"
                        subheading="List all qualifying questions you need from customers in order to book their appointment. This helps ensure you have all necessary information before the service."
                        icon={HelpCircle}
                        variant="blue"
                        className="mb-6"
                      />

                      <div
                        className={`border rounded-lg p-4 mb-6 ${
                          preBookingCheckboxError ? "border-red-300 bg-red-50" : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="noPreBookingQuestions"
                            checked={formData.noPreBookingQuestions}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => ({
                                ...prev,
                                noPreBookingQuestions: checked as boolean,
                                questions: checked ? [] : prev.questions,
                              }));
                              setPreBookingCheckboxError(false);
                            }}
                          />
                          <label
                            htmlFor="noPreBookingQuestions"
                            className={`text-sm font-medium cursor-pointer ${
                              preBookingCheckboxError ? "text-red-700" : "text-gray-700"
                            }`}
                          >
                            No pre-booking questions required for this service
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 ml-6">
                          Check this if customers can book this service without answering any
                          qualifying questions
                        </p>
                        {preBookingCheckboxError && (
                          <p className="text-xs text-red-600 mt-2 ml-6">
                            Required: add an active pre-booking question or check this box.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">
                            Pre-booking Questions
                          </h4>
                          <p className="text-sm text-gray-600">
                            Questions customers answer when booking
                          </p>
                        </div>
                        <Button
                          onClick={() => handleAddQuestion("pre-booking")}
                          size="sm"
                          variant="outline"
                          disabled={formData.noPreBookingQuestions}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Question
                        </Button>
                      </div>

                      {formData.noPreBookingQuestions ? (
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                          <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 font-medium">
                            No pre-booking questions required
                          </p>
                          <p className="text-gray-400 text-sm">
                            Customers can book this service without answering qualifying questions
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Question Form */}
                          {showQuestionForm && questionType === "pre-booking" && (
                            <Card className="border border-blue-200 bg-blue-50">
                              <CardContent className="p-6">
                                <QuestionForm
                                  question={editingQuestion}
                                  onSave={handleSaveQuestion}
                                  onCancel={handleCancelQuestion}
                                />
                              </CardContent>
                            </Card>
                          )}

                          {/* Existing Questions */}
                          {formData.questions.length === 0 && !showQuestionForm ? (
                            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                              <HelpCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-gray-500">No questions added yet</p>
                              <Button
                                onClick={() => handleAddQuestion("pre-booking")}
                                size="sm"
                                variant="outline"
                                className="mt-2 bg-transparent"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Your First Question
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {formData.questions.map((question, index) => (
                                <Card key={question.id} className="border border-gray-200">
                                  <CardContent className="p-4">
                                    <div className="flex items-center space-x-3">
                                      <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                          <span className="font-medium text-gray-900 truncate">
                                            {question.text}
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="text-xs flex-shrink-0"
                                          >
                                            {getTypeLabel(question.type)}
                                          </Badge>
                                          {question.required && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs text-red-600 border-red-200 flex-shrink-0"
                                            >
                                              Required
                                            </Badge>
                                          )}
                                          {!question.active && (
                                            <Badge
                                              variant="outline"
                                              className="text-xs text-gray-500 border-gray-300 flex-shrink-0"
                                            >
                                              Inactive
                                            </Badge>
                                          )}
                                        </div>
                                        {question.businessNotes && (
                                          <p className="text-sm text-gray-500 truncate">
                                            {question.businessNotes}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2 flex-shrink-0">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleMoveQuestion(question.id, "up", "pre-booking")
                                          }
                                          disabled={index === 0 || formData.noPreBookingQuestions}
                                          className="p-1 h-8 w-8"
                                        >
                                          ↑
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleMoveQuestion(question.id, "down", "pre-booking")
                                          }
                                          disabled={
                                            index === formData.questions.length - 1 ||
                                            formData.noPreBookingQuestions
                                          }
                                          className="p-1 h-8 w-8"
                                        >
                                          ↓
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleEditQuestion(question, "pre-booking")
                                          }
                                          disabled={formData.noPreBookingQuestions}
                                          className="p-1 h-8 w-8"
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="p-1 h-8 w-8 text-red-600"
                                          disabled={formData.noPreBookingQuestions}
                                          onClick={() => {
                                            if (
                                              confirm(
                                                "Are you sure you want to delete this question?"
                                              )
                                            ) {
                                              handleRemoveQuestion(question.id, "pre-booking");
                                            }
                                          }}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                        <Switch
                                          checked={question.active}
                                          onCheckedChange={() =>
                                            handleToggleQuestion(question.id, "pre-booking")
                                          }
                                          disabled={formData.noPreBookingQuestions}
                                        />
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowServiceForm(false);
                    setEditingService(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveService}
                  disabled={!formData.name.trim()}
                  variant="primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingService ? "Update Service" : "Save Service"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <Card className="bg-white border-0 shadow-xl mb-8">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LoadingSpinner size="md" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Loading your service templates...
              </h3>
              <p className="text-gray-600">
                We&apos;re fetching your saved service templates and configurations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Services List */}
            {services.length > 0 ? (
              <div className="space-y-4 mb-8">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className="bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-200 cursor-move"
                    draggable
                    onDragStart={(e) => handleDragStart(e, service.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, service.id)}
                    style={{
                      opacity: draggedItem === service.id ? 0.5 : 1,
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <GripVertical className="w-5 h-5 text-gray-400 mt-1 cursor-grab" />
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {service.name}
                              </h3>
                              <Badge variant="outline" className="text-xs">
                                {service.category === "Other" && service.customCategory
                                  ? service.customCategory
                                  : service.category}
                              </Badge>
                            </div>

                            {service.description && (
                              <p className="text-gray-600 mb-3">{service.description}</p>
                            )}

                            <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{formatDuration(service.duration)}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <DollarSign className="w-4 h-4" />
                                <span>
                                  {service.priceType === "variable"
                                    ? service.priceMin && service.priceMax
                                      ? `$${service.priceMin} - $${service.priceMax}`
                                      : "Variable pricing"
                                    : service.price > 0
                                      ? `$${service.price}`
                                      : "Free"}
                                </span>
                              </div>
                              {service.questions.length > 0 && (
                                <div className="flex items-center space-x-1">
                                  <HelpCircle className="w-4 h-4" />
                                  <span>{service.questions.length} pre-booking questions</span>
                                </div>
                              )}
                              {(service.qualificationQuestions?.length || 0) > 0 && (
                                <div className="flex items-center space-x-1">
                                  <HelpCircle className="w-4 h-4 text-orange-500" />
                                  <span>
                                    {service.qualificationQuestions?.length} qualification questions
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {getDeliveryBadges(service.deliveryOptions).map((badge, index) => (
                                <Badge key={index} className={`${badge.color} border-0`}>
                                  <badge.icon className="w-3 h-3 mr-1" />
                                  {badge.text}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditService(service)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDuplicateService(service)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteService(service.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="bg-white border-0 shadow-xl mb-8">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No services yet</h3>
                  <p className="text-gray-600 mb-6">
                    Start by browsing our template library or create your first service from
                    scratch.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => {
                        setEditingService(null);
                        setShowServiceForm(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create From Scratch
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Bottom Actions */}
        {!isLoading && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 space-y-4 sm:space-y-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRoutingPrevious(true);
                router.push(goPrevious(businessServiceTemplatesPage)?.pageRef ?? "");
              }}
              disabled={isSaving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                disabled={isSaving || isRoutingPrevious}
                loading={isSaving}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleContinue}
                disabled={services.length === 0 || isSaving || isRoutingPrevious}
                className="px-8"
                loading={isSaving}
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Inline Question Form Component
interface QuestionFormProps {
  question?: ServiceQuestion;
  onSave: (question: ServiceQuestion) => void;
  onCancel: () => void;
}

function QuestionForm({ question, onSave, onCancel }: QuestionFormProps) {
  const [formData, setFormData] = useState({
    text: "",
    type: "text",
    required: true,
    active: true,
    businessNotes: "",
    validation: {} as ValidationConfig,
    options: [] as Array<{ label: string; value: string }>,
    allowOther: false,
  });

  const [newOption, setNewOption] = useState({ label: "", value: "" });

  useEffect(() => {
    if (question) {
      setFormData({
        text: question.text || "",
        type: question.type || "text",
        required: question.required !== false,
        active: question.active !== false,
        businessNotes: question.businessNotes || "",
        validation: question.validation || {},
        options: question.options || [],
        allowOther: question.allowOther || false,
      });
    }
  }, [question]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleValidationChange = (field: keyof ValidationConfig, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      validation: { ...prev.validation, [field]: value },
    }));
  };

  const handleAddOption = () => {
    if (newOption.label.trim()) {
      const value = newOption.value.trim() || newOption.label.toLowerCase().replace(/\s+/g, "-");
      setFormData((prev) => ({
        ...prev,
        options: [...prev.options, { label: newOption.label.trim(), value }],
      }));
      setNewOption({ label: "", value: "" });
    }
  };

  const handleRemoveOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleMoveOption = (index: number, direction: "up" | "down") => {
    const newOptions = [...formData.options];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newOptions.length) {
      [newOptions[index], newOptions[targetIndex]] = [newOptions[targetIndex], newOptions[index]];
      setFormData((prev) => ({ ...prev, options: newOptions }));
    }
  };

  const handleSave = () => {
    if (!formData.text.trim()) return;

    const questionData: ServiceQuestion = {
      id: question?.id || Date.now().toString(),
      text: formData.text.trim(),
      type: formData.type as ServiceQuestion["type"],
      required: formData.required,
      active: formData.active,
      businessNotes: formData.businessNotes.trim() || undefined,
      validation: Object.keys(formData.validation).length > 0 ? formData.validation : undefined,
      options: formData.options.length > 0 ? formData.options : undefined,
      allowOther: formData.allowOther || undefined,
    };

    onSave(questionData);
  };

  const renderTypeSpecificFields = () => {
    switch (formData.type) {
      case "text":
      case "textarea":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Length
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.validation.minLength || ""}
                  onChange={(e) =>
                    handleValidationChange(
                      "minLength",
                      Number.parseInt(e.target.value) || undefined
                    )
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Length
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.validation.maxLength || ""}
                  onChange={(e) =>
                    handleValidationChange(
                      "maxLength",
                      Number.parseInt(e.target.value) || undefined
                    )
                  }
                  placeholder="200"
                />
              </div>
            </div>
          </div>
        );

      case "number":
      case "integer":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Value
                </label>
                <Input
                  type="number"
                  value={formData.validation.min || ""}
                  onChange={(e) =>
                    handleValidationChange("min", Number.parseFloat(e.target.value) || undefined)
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Value
                </label>
                <Input
                  type="number"
                  value={formData.validation.max || ""}
                  onChange={(e) =>
                    handleValidationChange("max", Number.parseFloat(e.target.value) || undefined)
                  }
                  placeholder="100"
                />
              </div>
            </div>
            {formData.type === "number" && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={formData.validation.allowDecimals !== false}
                    onCheckedChange={(checked) => handleValidationChange("allowDecimals", checked)}
                  />
                  <label className="text-sm font-medium text-gray-700">Allow decimals</label>
                </div>
                {formData.validation.allowDecimals !== false && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decimal Places
                    </label>
                    <Select
                      value={formData.validation.decimalPlaces?.toString() || "2"}
                      onValueChange={(value) =>
                        handleValidationChange("decimalPlaces", Number.parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case "single-choice":
      case "multiple-choice":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
              <div className="space-y-2 mb-4">
                {formData.options.map((option, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        value={option.label}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index].label = e.target.value;
                          setFormData((prev) => ({ ...prev, options: newOptions }));
                        }}
                        placeholder="Option label"
                      />
                      <Input
                        value={option.value}
                        onChange={(e) => {
                          const newOptions = [...formData.options];
                          newOptions[index].value = e.target.value;
                          setFormData((prev) => ({ ...prev, options: newOptions }));
                        }}
                        placeholder="Option value"
                      />
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveOption(index, "up")}
                        disabled={index === 0}
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMoveOption(index, "down")}
                        disabled={index === formData.options.length - 1}
                      >
                        ↓
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveOption(index)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                <Input
                  value={newOption.label}
                  onChange={(e) => setNewOption((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="New option label"
                  onKeyPress={(e) => e.key === "Enter" && handleAddOption()}
                />
                <Input
                  value={newOption.value}
                  onChange={(e) => setNewOption((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder="Value (optional)"
                  onKeyPress={(e) => e.key === "Enter" && handleAddOption()}
                />
                <Button onClick={handleAddOption} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                checked={formData.allowOther}
                onCheckedChange={(checked) => handleInputChange("allowOther", checked)}
              />
              <label className="text-sm font-medium text-gray-700">
                Allow &quot;Other&quot; option
              </label>
            </div>
          </div>
        );

      case "phone":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
            <Select
              value={formData.validation?.format || "us"}
              onValueChange={(value) => handleValidationChange("format", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us">US Format</SelectItem>
                <SelectItem value="international">International</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "address":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Required Components
            </label>
            <div className="space-y-3">
              {[
                { key: "street", label: "Street Address" },
                { key: "city", label: "City" },
                { key: "state", label: "State/Province" },
                { key: "zip", label: "ZIP/Postal Code" },
                { key: "country", label: "Country" },
              ].map((component) => (
                <div key={component.key} className="flex items-center space-x-3">
                  <Checkbox
                    checked={formData.validation.requiredComponents?.[component.key] !== false}
                    onCheckedChange={(checked) => {
                      const requiredComponents = formData.validation.requiredComponents || {};
                      handleValidationChange("requiredComponents", {
                        ...requiredComponents,
                        [component.key]: checked,
                      });
                    }}
                  />
                  <label className="text-sm font-medium text-gray-700">{component.label}</label>
                </div>
              ))}
            </div>
          </div>
        );

      case "image":
      case "document":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum File Size (MB)
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.validation?.maxSize ?? "10"}
                onChange={(e) =>
                  handleValidationChange("maxSize", Number.parseInt(e.target.value) || 10)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Number of Files
              </label>
              <Input
                type="number"
                min="1"
                max="20"
                value={formData.validation.maxFiles || "1"}
                onChange={(e) =>
                  handleValidationChange("maxFiles", Number.parseInt(e.target.value) || 1)
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Allowed File Types
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(formData.type === "image"
                  ? ["JPEG", "PNG", "GIF", "WebP", "SVG"]
                  : ["PDF", "DOC", "DOCX", "TXT", "RTF", "XLS", "XLSX", "PPT", "PPTX"]
                ).map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      checked={
                        formData.validation.allowedTypes?.includes(type.toLowerCase()) !== false
                      }
                      onCheckedChange={(checked) => {
                        const allowedTypes = formData.validation.allowedTypes || [];
                        const newTypes = checked
                          ? [...allowedTypes, type.toLowerCase()]
                          : allowedTypes.filter((t: string) => t !== type.toLowerCase());
                        handleValidationChange("allowedTypes", newTypes);
                      }}
                    />
                    <label className="text-sm text-gray-700">{type}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "measurement":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Unit Options</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "Square feet",
                  "Square meters",
                  "Acres",
                  "Linear feet",
                  "Cubic feet",
                  "Other",
                ].map((unit) => (
                  <div key={unit} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.validation.units?.includes(unit) !== false}
                      onCheckedChange={(checked) => {
                        const units = formData.validation.units || [];
                        const newUnits = checked
                          ? [...units, unit]
                          : units.filter((u: string) => u !== unit);
                        handleValidationChange("units", newUnits);
                      }}
                    />
                    <label className="text-sm text-gray-700">{unit}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Value
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.validation.min || ""}
                  onChange={(e) =>
                    handleValidationChange("min", Number.parseFloat(e.target.value) || undefined)
                  }
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Value
                </label>
                <Input
                  type="number"
                  min="0"
                  value={formData.validation.max || ""}
                  onChange={(e) =>
                    handleValidationChange("max", Number.parseFloat(e.target.value) || undefined)
                  }
                  placeholder="1000"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {question ? "Edit Question" : "Add Question"}
        </h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
        <p className="text-xs text-gray-500 mb-2">
          This is the question that will be displayed to the customer. You do not need to include a
          question for meeting time, name, or phone number. That will be handled for you. These are
          questions specifically necessary for this service.
        </p>
        <Textarea
          value={formData.text}
          onChange={(e) => handleInputChange("text", e.target.value)}
          placeholder="What would you like to ask customers?"
          className="min-h-[80px] resize-none"
          maxLength={200}
        />
        <div className="text-right text-xs text-gray-500 mt-1">{formData.text.length}/200</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Answer Type *</label>
        <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(
              SERVICE_ANSWER_TYPES.reduce(
                (groups, type) => {
                  if (!groups[type.group]) groups[type.group] = [];
                  groups[type.group].push(type);
                  return groups;
                },
                {} as Record<string, typeof SERVICE_ANSWER_TYPES>
              )
            ).map(([group, types]) => (
              <div key={group}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group}
                </div>
                {types.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type-specific validation fields */}
      {renderTypeSpecificFields()}

      {/* Common fields */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <Switch
            checked={formData.required}
            onCheckedChange={(checked) => handleInputChange("required", checked)}
          />
          <label className="text-sm font-medium text-gray-700">Required for booking</label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Expected Values/Validation Notes{" "}
            <span className="text-gray-400">(optional - internal use only)</span>
          </label>
          <Textarea
            value={formData.businessNotes}
            onChange={(e) => handleInputChange("businessNotes", e.target.value)}
            placeholder="Describe what you're looking for in this answer to help us better understand your needs..."
            className="min-h-[80px] resize-none"
          />
          <p className="text-xs text-gray-500 mt-1">
            This information is only visible to you and helps us tailor our application to your
            business needs.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!formData.text.trim()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Question
        </Button>
      </div>
    </div>
  );
}
