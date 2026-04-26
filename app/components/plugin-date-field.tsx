import DatePicker from "@cloudscape-design/components/date-picker";
import FormField from "@cloudscape-design/components/form-field";
import React from "react";
import { formatDatePickerValue, normalizeDateOnlyValue } from "../utils/date";

type PluginDateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  placeholder?: string;
  min?: string;
  max?: string;
};

export function PluginDateField(props: PluginDateFieldProps) {
  const {
    label,
    value,
    onChange,
    description,
    placeholder = "YYYY/MM/DD",
    min,
    max,
  } = props;

  const minDate = React.useMemo(() => formatDatePickerValue(min), [min]);
  const maxDate = React.useMemo(() => formatDatePickerValue(max), [max]);

  const isDateEnabled = React.useCallback((date: Date) => {
    const candidate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    if (minDate && candidate < minDate.replaceAll("/", "-")) {
      return false;
    }

    if (maxDate && candidate > maxDate.replaceAll("/", "-")) {
      return false;
    }

    return true;
  }, [maxDate, minDate]);

  return (
    <FormField label={label} description={description}>
      <DatePicker
        value={formatDatePickerValue(value)}
        placeholder={placeholder}
        isDateEnabled={isDateEnabled}
        openCalendarAriaLabel={(selectedDate) => `${label}${selectedDate ? `, ${selectedDate}` : ""}`}
        onChange={({ detail }) => onChange(normalizeDateOnlyValue(detail.value))}
      />
    </FormField>
  );
}
