interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  // text = "Loading...",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={`text-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4`}
      />
      {/* {text && <p className="text-gray-600">{text}</p>} */}
    </div>
  );
}

export default LoadingSpinner;
