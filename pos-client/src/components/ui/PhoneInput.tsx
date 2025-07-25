import { cva } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const phoneInputVariants = cva(
  "flex h-10 w-full rounded-md border border-border-default bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
);

interface PhoneInputProps {
  className?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="tel"
        pattern="[0-9]{10}"
        maxLength={10}
        className={cn(phoneInputVariants({ className }))}
        ref={ref}
        placeholder="(555) 123-4567"
        {...props}
      />
    );
  }
);
PhoneInput.displayName = "PhoneInput"; 