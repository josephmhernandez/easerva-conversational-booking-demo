"use client";

import {
  Service,
  ServiceFormData,
  ServicePricing,
  ServiceQuestion,
  ValidationConfig,
} from "@/app/types/businessTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  Edit,
  GripVertical,
  HelpCircle,
  MapPin,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  BUSINESS_CATEGORIES,
  SERVICE_ADVANCE_NOTICE_OPTIONS,
  SERVICE_ANSWER_TYPES,
  SERVICE_DURATION_OPTIONS,
  SERVICE_MAX_BOOKING_OPTIONS,
} from "../../constants/businessConstants";

interface ServiceFormModalProps {
  service?: Service;
  onSave: (service: Service) => void;
  onClose: () => void;
}

interface QuestionBuilderProps {
  question?: ServiceQuestion;
  onSave: (question: ServiceQuestion) => void;
  onClose: () => void;
}

function QuestionBuilder({ question, onSave, onClose }: QuestionBuilderProps) {
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
  // const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {question ? "Edit Question" : "Add Question"}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Text *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  This is the question that will be displayed to the customer. You do not need to
                  include a question for meeting time, name, or phone number. That will be handled
                  for you. These are questions specifically necessary for this service.
                </p>
                <Textarea
                  value={formData.text}
                  onChange={(e) => handleInputChange("text", e.target.value)}
                  placeholder="What would you like to ask customers?"
                  className="min-h-[80px] resize-none"
                  maxLength={200}
                />
                <div className="text-right text-xs text-gray-500 mt-1">
                  {formData.text.length}/200
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Answer Type *
                </label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange("type", value)}
                >
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
                    This information is only visible to you and helps us tailor our application to
                    your business needs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.text.trim()}
            className="bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Question
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ServiceFormModal({ service, onSave, onClose }: ServiceFormModalProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ServiceQuestion | undefined>();
  const [formData, setFormData] = useState<ServiceFormData>({
    name: "",
    category: "Beauty",
    description: "",
    duration: 60,
    durationType: "fixed",
    customHours: 1,
    customMinutes: 0,
    pricing: {
      type: "fixed",
      amount: 0,
      startingAt: 0,
      upTo: 0,
      displayText: "Free",
    },
    requirements: {
      physicalLocation: true,
      virtual: false,
      customerLocation: false,
    },
    bookingRules: {
      minAdvanceNotice: "1hr",
      maxAdvanceBooking: "1 month",
    },
    searchTags: [],
    questions: [],
    paymentSettings: {
      requirement: "none",
      depositAmount: 0,
      policy: "",
    },
  });

  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || "",
        category: service.category || "Beauty",
        description: service.description || "",
        duration: service.duration || 60,
        durationType: service.durationType || "fixed",
        customHours: Math.floor((service.duration || 60) / 60),
        customMinutes: (service.duration || 60) % 60,
        pricing: service.pricing || {
          type: "fixed",
          amount: 0,
          startingAt: 0,
          upTo: 0,
          displayText: "Free",
        },
        requirements: service.requirements || {
          physicalLocation: true,
          virtual: false,
          customerLocation: false,
        },
        bookingRules: service.bookingRules || {
          minAdvanceNotice: "1hr",
          maxAdvanceBooking: "1 month",
        },
        searchTags: service.searchTags || [],
        questions: service.questions || [],
        paymentSettings: service.paymentSettings || {
          requirement: "none",
          depositAmount: 0,
          policy: "",
        },
      });
    }
  }, [service]);

  const handleInputChange = (field: keyof ServiceFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent: keyof ServiceFormData, field: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as object),
        [field]: value,
      },
    }));
  };

  const handleDurationChange = (value: number | string) => {
    if (value === "custom") {
      setFormData((prev) => ({ ...prev, durationType: "custom" }));
    } else {
      setFormData((prev) => ({
        ...prev,
        duration: value as number,
        durationType: "fixed",
      }));
    }
  };

  const handleCustomDurationChange = () => {
    const totalMinutes = formData.customHours * 60 + formData.customMinutes;
    setFormData((prev) => ({ ...prev, duration: totalMinutes }));
  };

  const handlePricingChange = (type: string) => {
    let displayText = "Free";

    if (type === "fixed" && formData.pricing.amount > 0) {
      displayText = `$${formData.pricing.amount}`;
    } else if (type === "variable") {
      if (formData.pricing.startingAt > 0 && formData.pricing.upTo > 0) {
        displayText = `$${formData.pricing.startingAt} - $${formData.pricing.upTo}`;
      } else if (formData.pricing.startingAt > 0) {
        displayText = `Starting at $${formData.pricing.startingAt}`;
      }
    }

    setFormData((prev) => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        type: type as ServicePricing["type"],
        displayText,
      },
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.searchTags.includes(tagInput.trim().toLowerCase())) {
      setFormData((prev) => ({
        ...prev,
        searchTags: [...prev.searchTags, tagInput.trim().toLowerCase()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      searchTags: prev.searchTags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleSaveQuestion = (question: ServiceQuestion) => {
    setFormData((prev) => {
      const existingIndex = prev.questions.findIndex((q) => q.id === question.id);
      if (existingIndex >= 0) {
        const newQuestions = [...prev.questions];
        newQuestions[existingIndex] = question;
        return { ...prev, questions: newQuestions };
      } else {
        return { ...prev, questions: [...prev.questions, question] };
      }
    });
    setShowQuestionBuilder(false);
    setEditingQuestion(undefined);
  };

  const handleEditQuestion = (question: ServiceQuestion) => {
    setEditingQuestion(question);
    setShowQuestionBuilder(true);
  };

  const handleDeleteQuestion = (questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== questionId),
    }));
  };

  const handleToggleQuestion = (questionId: string) => {
    setFormData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === questionId ? { ...q, active: !q.active } : q)),
    }));
  };

  const handleMoveQuestion = (questionId: string, direction: "up" | "down") => {
    setFormData((prev) => {
      const questions = [...prev.questions];
      const index = questions.findIndex((q) => q.id === questionId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < questions.length) {
        [questions[index], questions[targetIndex]] = [questions[targetIndex], questions[index]];
      }

      return { ...prev, questions };
    });
  };

  const handleSave = () => {
    // Calculate final duration for custom
    let finalDuration = formData.duration;
    if (formData.durationType === "custom") {
      finalDuration = formData.customHours * 60 + formData.customMinutes;
    }

    const serviceData = {
      ...formData,
      duration: finalDuration,
    };

    onSave(serviceData);
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

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {service ? "Edit Service" : "Add New Service"}
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(85vh-140px)]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-6 mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger
                    value="basic"
                    className="flex items-center justify-center space-x-1 text-xs sm:text-sm px-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="hidden sm:inline">Basic Info</span>
                    <span className="sm:hidden">Basic</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="requirements"
                    className="flex items-center justify-center space-x-1 text-xs sm:text-sm px-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">Requirements</span>
                    <span className="sm:hidden">Rules</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="questions"
                    className="flex items-center justify-center space-x-1 text-xs sm:text-sm px-2"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Questions</span>
                    <span className="sm:hidden">Q&A</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                {/* Tab 1: Basic Information */}
                <TabsContent value="basic" className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Name *
                    </label>
                    <Input
                      placeholder="e.g., Hair Cut & Style"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => handleInputChange("category", value)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-gray-400">(optional)</span>
                    </label>
                    <Textarea
                      placeholder="Brief description of your service..."
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      className="min-h-[80px] resize-none"
                      maxLength={200}
                    />
                    <div className="text-right text-xs text-gray-500 mt-1">
                      {formData.description.length}/200
                    </div>
                  </div>

                  {/* Duration Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Duration *
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {SERVICE_DURATION_OPTIONS.map((option) => (
                        <Button
                          key={option.label}
                          variant={
                            (option.value === "custom" && formData.durationType === "custom") ||
                            (option.value === formData.duration.toString() &&
                              formData.durationType === "fixed")
                              ? "default"
                              : "outline"
                          }
                          onClick={() => handleDurationChange(option.value)}
                          className="h-10"
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>

                    {formData.durationType === "custom" && (
                      <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max="23"
                            value={formData.customHours}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                customHours: Number.parseInt(e.target.value) || 0,
                              }));
                              handleCustomDurationChange();
                            }}
                            className="w-20 h-10"
                          />
                          <span className="text-sm text-gray-600">hours</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            step="15"
                            value={formData.customMinutes}
                            onChange={(e) => {
                              setFormData((prev) => ({
                                ...prev,
                                customMinutes: Number.parseInt(e.target.value) || 0,
                              }));
                              handleCustomDurationChange();
                            }}
                            className="w-20 h-10"
                          />
                          <span className="text-sm text-gray-600">minutes</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pricing Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Pricing *
                    </label>

                    <div className="space-y-4">
                      <div className="flex space-x-4">
                        {["free", "fixed", "variable"].map((type) => (
                          <Button
                            key={type}
                            variant={formData.pricing.type === type ? "default" : "outline"}
                            onClick={() => handlePricingChange(type)}
                            className="capitalize"
                          >
                            {type === "variable" ? "Variable Price" : type}
                          </Button>
                        ))}
                      </div>

                      {formData.pricing.type === "fixed" && (
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-medium text-gray-700">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.pricing.amount || ""}
                            onChange={(e) => {
                              const amount = Number.parseFloat(e.target.value) || 0;
                              setFormData((prev) => ({
                                ...prev,
                                pricing: {
                                  ...prev.pricing,
                                  amount,
                                  displayText: amount > 0 ? `$${amount}` : "Free",
                                },
                              }));
                            }}
                            className="w-32 h-10"
                          />
                        </div>
                      )}

                      {formData.pricing.type === "variable" && (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Starting at $</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.pricing.startingAt || ""}
                                onChange={(e) => {
                                  const startingAt = Number.parseFloat(e.target.value) || 0;
                                  setFormData((prev) => ({
                                    ...prev,
                                    pricing: {
                                      ...prev.pricing,
                                      startingAt,
                                      displayText:
                                        startingAt > 0 ? `Starting at $${startingAt}` : "Free",
                                    },
                                  }));
                                }}
                                className="w-32 h-10"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Up to $</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.pricing.upTo || ""}
                                onChange={(e) => {
                                  const upTo = Number.parseFloat(e.target.value) || 0;
                                  const startingAt = formData.pricing.startingAt || 0;
                                  let displayText = "Free";
                                  if (startingAt > 0 && upTo > 0) {
                                    displayText = `$${startingAt} - $${upTo}`;
                                  } else if (startingAt > 0) {
                                    displayText = `Starting at $${startingAt}`;
                                  }
                                  setFormData((prev) => ({
                                    ...prev,
                                    pricing: {
                                      ...prev.pricing,
                                      upTo,
                                      displayText,
                                    },
                                  }));
                                }}
                                className="w-32 h-10"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Display text: </span>
                        <span className="font-medium">{formData.pricing.displayText}</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Requirements & Rules */}
                <TabsContent value="requirements" className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Service Requirements</h3>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="physicalLocation"
                          checked={formData.requirements.physicalLocation}
                          onCheckedChange={(checked) =>
                            handleNestedChange("requirements", "physicalLocation", checked)
                          }
                        />
                        <label
                          htmlFor="physicalLocation"
                          className="text-sm font-medium text-gray-700"
                        >
                          Requires physical location
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="virtual"
                          checked={formData.requirements.virtual}
                          onCheckedChange={(checked) =>
                            handleNestedChange("requirements", "virtual", checked)
                          }
                        />
                        <label htmlFor="virtual" className="text-sm font-medium text-gray-700">
                          Can be done virtually
                        </label>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="customerLocation"
                          checked={formData.requirements.customerLocation}
                          onCheckedChange={(checked) =>
                            handleNestedChange("requirements", "customerLocation", checked)
                          }
                        />
                        <label
                          htmlFor="customerLocation"
                          className="text-sm font-medium text-gray-700"
                        >
                          Service at customer location
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Rules</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum advance notice
                        </label>
                        <Select
                          value={formData.bookingRules.minAdvanceNotice}
                          onValueChange={(value) =>
                            handleNestedChange("bookingRules", "minAdvanceNotice", value)
                          }
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_ADVANCE_NOTICE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum advance booking
                        </label>
                        <Select
                          value={formData.bookingRules.maxAdvanceBooking}
                          onValueChange={(value) =>
                            handleNestedChange("bookingRules", "maxAdvanceBooking", value)
                          }
                        >
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SERVICE_MAX_BOOKING_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Tags
                    </label>
                    <div className="flex items-center space-x-2 mb-3">
                      <Input
                        placeholder="Add search tags..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        className="flex-1 h-10"
                      />
                      <Button onClick={handleAddTag} size="sm">
                        Add
                      </Button>
                    </div>
                    {formData.searchTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.searchTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-orange-100 text-orange-800 hover:bg-orange-200 cursor-pointer"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag}
                            <X className="w-3 h-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Tab 3: Pre-Booking Questions */}
                <TabsContent value="questions" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Information to collect before booking
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Add questions customers must answer when booking this service
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingQuestion(undefined);
                        setShowQuestionBuilder(true);
                      }}
                      className="bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {formData.questions.length === 0 ? (
                    <Card className="border-2 border-dashed border-gray-200">
                      <CardContent className="p-8 text-center">
                        <HelpCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h4 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h4>
                        <p className="text-gray-600 mb-4">
                          Add questions to collect information you need from customers before the
                          appointment itself.
                        </p>
                        <Button
                          onClick={() => {
                            setEditingQuestion(undefined);
                            setShowQuestionBuilder(true);
                          }}
                          variant="outline"
                          className="border-orange-200 text-orange-600 hover:bg-orange-50 bg-transparent"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Question
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {formData.questions.map((question, index) => (
                        <Card key={question.id} className="border border-gray-200">
                          <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                              <GripVertical
                                className="w-5 h-5 text-gray-400 cursor-grab"
                                onMouseDown={() => {
                                  /* Handle drag start */
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1 flex-wrap">
                                  <span className="font-medium text-gray-900 truncate">
                                    {question.text}
                                  </span>
                                  <Badge variant="outline" className="text-xs flex-shrink-0">
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
                                  onClick={() => handleMoveQuestion(question.id, "up")}
                                  disabled={index === 0}
                                  className="p-1 h-8 w-8"
                                >
                                  ↑
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveQuestion(question.id, "down")}
                                  disabled={index === formData.questions.length - 1}
                                  className="p-1 h-8 w-8"
                                >
                                  ↓
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditQuestion(question)}
                                  className="p-1 h-8 w-8"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1 h-8 w-8 text-red-600"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this question?")) {
                                      handleDeleteQuestion(question.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Switch
                                  checked={question.active}
                                  onCheckedChange={() => handleToggleQuestion(question.id)}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.name.trim()}
              className="bg-gradient-to-r from-orange-400 to-pink-500 hover:from-orange-500 hover:to-pink-600 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Service
            </Button>
          </div>
        </div>
      </div>

      {/* Question Builder Modal */}
      {showQuestionBuilder && (
        <QuestionBuilder
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => {
            setShowQuestionBuilder(false);
            setEditingQuestion(undefined);
          }}
        />
      )}
    </>
  );
}
