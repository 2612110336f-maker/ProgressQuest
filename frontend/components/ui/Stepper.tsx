import React from "react";

interface StepperProps {
  currentStep: number;
  steps: string[];
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = currentStep > stepNumber;
          const isActive = currentStep === stepNumber;

          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center flex-1 relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-display border transition-all duration-300 ${
                    isCompleted
                      ? "bg-success border-success text-white shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                      : isActive
                      ? "bg-primary border-primary text-white shadow-[0_0_12px_rgba(108,99,255,0.6)] scale-110"
                      : "bg-card border-border text-slate-400"
                  }`}
                >
                  {isCompleted ? "✓" : stepNumber}
                </div>
                <span
                  className={`mt-2 text-[10px] sm:text-xs font-medium text-center font-display ${
                    isActive ? "text-primary font-bold" : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-[2px] flex-1 self-start mt-4 transition-all duration-500 ${
                    isCompleted ? "bg-success" : "bg-border"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Stepper;
