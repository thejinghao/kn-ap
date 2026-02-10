import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getCaretCoordinates } from '@/lib/utils/caret-coordinates';

interface EnvironmentVariable {
  name: string;
  value: string;
  isSecret?: boolean;
  source: 'vercel' | 'env_file' | 'user' | 'response';
  description?: string;
}

interface AutocompleteState {
  isOpen: boolean;
  filteredVariables: EnvironmentVariable[];
  selectedIndex: number;
}

interface DropdownPosition {
  top: number;
  left: number;
}

interface UseVariableAutocompleteParams {
  value: string;
  onChange: (value: string) => void;
  variables: EnvironmentVariable[];
}

interface UseVariableAutocompleteReturn {
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
  autocompleteState: AutocompleteState;
  dropdownPosition: DropdownPosition | null;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  selectVariable: (variable: EnvironmentVariable) => void;
  closeAutocomplete: () => void;
}

export function useVariableAutocomplete({
  value,
  onChange,
  variables,
}: UseVariableAutocompleteParams): UseVariableAutocompleteReturn {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [triggerPosition, setTriggerPosition] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter and sort variables based on search term
  const filteredVariables = useMemo(() => {
    if (!searchTerm) {
      return [...variables].sort((a, b) => a.name.localeCompare(b.name));
    }

    const term = searchTerm.toLowerCase();
    const matches = variables.filter((v) =>
      v.name.toLowerCase().includes(term)
    );

    // Prioritize prefix matches, then sort alphabetically
    return matches.sort((a, b) => {
      const aStartsWith = a.name.toLowerCase().startsWith(term);
      const bStartsWith = b.name.toLowerCase().startsWith(term);

      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [variables, searchTerm]);

  // Detect trigger pattern and extract search term
  const detectTrigger = useCallback((text: string, cursorPosition: number) => {
    // Find the most recent {{ before the cursor
    let lastTriggerPos = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (text[i] === '{' && i > 0 && text[i - 1] === '{') {
        lastTriggerPos = i - 1;
        break;
      }
    }

    if (lastTriggerPos === -1) {
      return null;
    }

    // Check if there's a closing }} between trigger and cursor
    const textBetween = text.substring(lastTriggerPos + 2, cursorPosition);
    if (textBetween.includes('}}')) {
      return null;
    }

    return {
      position: lastTriggerPos,
      searchTerm: textBetween,
    };
  }, []);

  // Calculate dropdown position
  const calculateDropdownPosition = useCallback(() => {
    if (!inputRef.current || triggerPosition === null) {
      return null;
    }

    const element = inputRef.current;
    const rect = element.getBoundingClientRect();
    const isTextarea = element.tagName === 'TEXTAREA';

    let top: number;
    let left: number;

    if (isTextarea) {
      // For textareas, position at cursor
      const cursorPos = element.selectionStart || 0;
      const coords = getCaretCoordinates(element, cursorPos);
      top = rect.top + coords.top + coords.height;
      left = rect.left + coords.left;
    } else {
      // For inputs, position below the input
      top = rect.bottom;
      left = rect.left;
    }

    // Ensure dropdown stays within viewport (with 8px padding)
    const dropdownWidth = 400; // approximate width
    const dropdownHeight = 300; // max height
    const padding = 8;

    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    if (top + dropdownHeight > window.innerHeight - padding) {
      // Position above the input instead
      top = rect.top - dropdownHeight;
      if (top < padding) {
        top = padding;
      }
    }

    return { top, left };
  }, [triggerPosition]);

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart || 0;

      onChange(newValue);

      // Debounce trigger detection
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const trigger = detectTrigger(newValue, cursorPosition);

        if (trigger) {
          setTriggerPosition(trigger.position);
          setSearchTerm(trigger.searchTerm);
          setIsOpen(true);
          setSelectedIndex(0);
        } else {
          setIsOpen(false);
          setTriggerPosition(null);
          setSearchTerm('');
        }
      }, 100);
    },
    [onChange, detectTrigger]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredVariables.length - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;

        case 'Enter':
        case 'Tab':
          if (filteredVariables.length > 0) {
            e.preventDefault();
            selectVariable(filteredVariables[selectedIndex]);
          }
          break;

        case 'Escape':
          e.preventDefault();
          closeAutocomplete();
          break;
      }
    },
    [isOpen, filteredVariables, selectedIndex]
  );

  // Select a variable and insert it
  const selectVariable = useCallback(
    (variable: EnvironmentVariable) => {
      if (!inputRef.current || triggerPosition === null) return;

      const element = inputRef.current;
      const cursorPosition = element.selectionStart || 0;
      const currentValue = element.value;

      // Replace from {{ to cursor with {{variableName}}
      const before = currentValue.substring(0, triggerPosition);
      const after = currentValue.substring(cursorPosition);
      const newValue = `${before}{{${variable.name}}}${after}`;

      onChange(newValue);

      // Set cursor after the inserted variable
      const newCursorPosition = triggerPosition + variable.name.length + 4; // 4 for {{ and }}
      setTimeout(() => {
        element.focus();
        element.setSelectionRange(newCursorPosition, newCursorPosition);
      }, 0);

      closeAutocomplete();
    },
    [triggerPosition, onChange]
  );

  // Close autocomplete
  const closeAutocomplete = useCallback(() => {
    setIsOpen(false);
    setTriggerPosition(null);
    setSearchTerm('');
    setSelectedIndex(0);
  }, []);

  // Update dropdown position when it opens or trigger position changes
  useEffect(() => {
    if (isOpen) {
      const position = calculateDropdownPosition();
      setDropdownPosition(position);
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen, triggerPosition, calculateDropdownPosition]);

  // Handle cursor movement - close if cursor moves outside trigger context
  useEffect(() => {
    const element = inputRef.current;
    if (!element || !isOpen) return;

    const handleSelectionChange = () => {
      const cursorPosition = element.selectionStart || 0;
      const trigger = detectTrigger(element.value, cursorPosition);

      if (!trigger || trigger.position !== triggerPosition) {
        closeAutocomplete();
      }
    };

    element.addEventListener('click', handleSelectionChange);
    element.addEventListener('keyup', handleSelectionChange);

    return () => {
      element.removeEventListener('click', handleSelectionChange);
      element.removeEventListener('keyup', handleSelectionChange);
    };
  }, [isOpen, triggerPosition, detectTrigger, closeAutocomplete]);

  // Clean up debounce timeout
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    inputRef,
    autocompleteState: {
      isOpen,
      filteredVariables,
      selectedIndex,
    },
    dropdownPosition,
    handleChange,
    handleKeyDown,
    selectVariable,
    closeAutocomplete,
  };
}
