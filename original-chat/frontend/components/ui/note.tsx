import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface NoteProps {
  heading?: string;
  subheading?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  variant?: "amber" | "blue" | "error";
  className?: string;
}

export function Note({
  heading,
  subheading,
  icon: Icon,
  badge,
  variant = "blue",
  className = "",
}: NoteProps) {
  const variantStyles = {
    amber: {
      container: "bg-amber-50 border-amber-200",
      icon: "text-amber-600",
      text: "text-amber-800",
    },
    blue: {
      container: "bg-blue-50 border-blue-200",
      icon: "text-blue-600",
      text: "text-blue-700",
    },
    error: {
      container: "border-red-200",
      icon: "text-red-600",
      text: "text-red-700",
    },
  };

  const styles = variantStyles[variant];

  // Don't render if neither heading nor subheading is provided
  if (!heading && !subheading) {
    return null;
  }

  return (
    <div className={`mb-8 p-4 border rounded-lg ${styles.container} ${className}`}>
      <div className="flex items-start space-x-3">
        {Icon && <Icon className={`w-5 h-5 ${styles.icon} mt-0.5 flex-shrink-0`} />}
        <div className="flex-1">
          {heading && (
            <div className="flex items-center justify-between mb-1">
              <p className={`text-sm ${styles.text}`}>
                <strong>{heading}</strong>
              </p>
              {badge && <div className="ml-2">{badge}</div>}
            </div>
          )}
          {subheading && <p className={`text-sm ${styles.text}`}>{subheading}</p>}
        </div>
      </div>
    </div>
  );
}
