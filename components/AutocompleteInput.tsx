'use client';

import React from 'react';
import { useVariableAutocomplete } from '@/lib/hooks/useVariableAutocomplete';
import { VariableAutocompleteDropdown } from './VariableAutocompleteDropdown';

interface EnvironmentVariable {
  name: string;
  value: string;
  isSecret?: boolean;
  source: 'vercel' | 'env_file' | 'user' | 'response';
  description?: string;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  variables: EnvironmentVariable[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  wrapperClassName?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  variables,
  placeholder,
  disabled,
  required,
  className,
  wrapperClassName = 'relative w-full',
}: AutocompleteInputProps) {
  const autocomplete = useVariableAutocomplete({
    value,
    onChange,
    variables,
  });

  return (
    <div className={wrapperClassName}>
      <input
        ref={autocomplete.inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={value}
        onChange={autocomplete.handleChange}
        onKeyDown={autocomplete.handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={className}
      />
      <VariableAutocompleteDropdown
        isOpen={autocomplete.autocompleteState.isOpen}
        variables={autocomplete.autocompleteState.filteredVariables}
        selectedIndex={autocomplete.autocompleteState.selectedIndex}
        position={autocomplete.dropdownPosition}
        onSelect={autocomplete.selectVariable}
        onClose={autocomplete.closeAutocomplete}
      />
    </div>
  );
}

interface AutocompleteTextareaProps {
  value: string;
  onChange: (value: string) => void;
  variables: EnvironmentVariable[];
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  wrapperClassName?: string;
}

export function AutocompleteTextarea({
  value,
  onChange,
  variables,
  placeholder,
  disabled,
  rows = 8,
  className,
  wrapperClassName = 'relative w-full',
}: AutocompleteTextareaProps) {
  const autocomplete = useVariableAutocomplete({
    value,
    onChange,
    variables,
  });

  return (
    <div className={wrapperClassName}>
      <textarea
        ref={autocomplete.inputRef as React.RefObject<HTMLTextAreaElement>}
        value={value}
        onChange={autocomplete.handleChange}
        onKeyDown={autocomplete.handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={className}
      />
      <VariableAutocompleteDropdown
        isOpen={autocomplete.autocompleteState.isOpen}
        variables={autocomplete.autocompleteState.filteredVariables}
        selectedIndex={autocomplete.autocompleteState.selectedIndex}
        position={autocomplete.dropdownPosition}
        onSelect={autocomplete.selectVariable}
        onClose={autocomplete.closeAutocomplete}
      />
    </div>
  );
}
