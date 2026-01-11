export interface ManaSelectOption {
    id: string;
    value: string;
    label: string;
}

export interface ManaSelectProps {
    options: ManaSelectOption[];
    value?: string | string[] | null;
    onSelectionChange?: (value: string | string[] | null) => void;
    selectionMode?: "single" | "multiple";
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    clearable?: boolean;
    fullWidth?: boolean;
    autoFocus?: boolean;
    closeOnSelect?: boolean;
    shouldFocusWrap?: boolean;
    maxOptionsVisible?: number;
    wrapTags?: boolean;
}
