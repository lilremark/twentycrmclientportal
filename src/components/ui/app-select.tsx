"use client";

import {
  Children,
  isValidElement,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function AppSelect({
  options,
  children,
  className,
  defaultValue,
  disabled,
  id,
  name,
  onValueChange,
  required,
  value,
  onChange,
  style,
  "aria-label": ariaLabel,
}: {
  options?: AppSelectOption[];
  children?: ReactNode;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  onValueChange?: (value: string) => void;
  onChange?: (event: { target: { value: string } }) => void;
  required?: boolean;
  style?: CSSProperties;
  value?: string;
  "aria-label"?: string;
}) {
  const resolvedOptions =
    options ??
    Children.toArray(children).flatMap((child) => {
      if (!isValidElement(child) || child.type !== "option") return [];
      const option = child as ReactElement<{
        children?: ReactNode;
        disabled?: boolean;
        value?: string | number;
      }>;
      return [
        {
          disabled: option.props.disabled,
          label: Children.toArray(option.props.children).join(""),
          value: String(option.props.value ?? ""),
        },
      ];
    });

  return (
    <Select<string>
      defaultValue={defaultValue}
      disabled={disabled}
      items={resolvedOptions}
      name={name}
      onValueChange={(nextValue) => {
        const normalizedValue = nextValue ?? "";
        onValueChange?.(normalizedValue);
        onChange?.({ target: { value: normalizedValue } });
      }}
      required={required}
      value={value}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn("input app-select-trigger", className)}
        id={id}
        style={style}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectPopup className="app-select-list">
        {resolvedOptions.map((option) => (
          <SelectItem
            className="app-select-item"
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
