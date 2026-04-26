import Autosuggest from "@cloudscape-design/components/autosuggest";
import type { AutosuggestProps } from "@cloudscape-design/components/autosuggest";
import React from "react";
import type { SelectOption } from "../types";

type AutosuggestOption = AutosuggestProps.Option & {
  relationId: string;
};

type RelationAutosuggestProps = {
  selectedOption: SelectOption | null;
  options: SelectOption[];
  value?: string;
  placeholder: string;
  empty: React.ReactNode;
  ariaLabel: string;
  disabled?: boolean;
  statusType?: AutosuggestProps.StatusType;
  loadingText?: string;
  errorText?: string;
  enteredTextLabel?: AutosuggestProps.EnteredTextLabel;
  onChange: (option: SelectOption | null) => void;
  onInputValueChange?: (value: string) => void;
};

export function RelationAutosuggest(props: RelationAutosuggestProps) {
  const {
    selectedOption,
    options,
    value: controlledValue,
    placeholder,
    empty,
    ariaLabel,
    disabled,
    statusType,
    loadingText,
    errorText,
    enteredTextLabel,
    onChange,
    onInputValueChange,
  } = props;

  const autosuggestOptions = React.useMemo<AutosuggestOption[]>(
    () => options.map((option) => ({
      value: option.label,
      label: option.label,
      description: option.description,
      tags: option.tags ? [...option.tags] : undefined,
      relationId: option.value,
    })),
    [options],
  );

  const selectedLabel = selectedOption?.label ?? "";
  const [value, setValue] = React.useState(selectedLabel || controlledValue || "");

  React.useEffect(() => {
    setValue(selectedLabel || controlledValue || "");
  }, [controlledValue, selectedLabel]);

  return (
    <Autosuggest
      value={value}
      options={autosuggestOptions}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      disabled={disabled}
      disableBrowserAutocorrect
      virtualScroll
      empty={empty}
      statusType={statusType}
      loadingText={loadingText}
      errorText={errorText}
      filteringType="manual"
      enteredTextLabel={enteredTextLabel}
      onChange={({ detail }) => {
        setValue(detail.value);
        const exactMatch = autosuggestOptions.some((option) => option.value === detail.value);

        onInputValueChange?.(detail.value);

        if (selectedLabel !== detail.value && !exactMatch) {
          onChange(null);
        }
      }}
      onSelect={({ detail }) => {
        const match = autosuggestOptions.find((option) => option.value === detail.value);

        if (!match) {
          return;
        }

        const nextLabel = match.label ?? match.value ?? "";
        setValue(nextLabel);
        onInputValueChange?.(nextLabel);
        onChange({
          label: nextLabel,
          value: match.relationId,
          description: match.description,
          tags: match.tags ? [...match.tags] : undefined,
        });
      }}
    />
  );
}
