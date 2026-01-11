export type ProgressBarVariant = "blue" | "orange" | "unset";

export interface ProgressBarOverride {
    background?: string;
    gradientStart?: string;
    gradientEnd?: string;
}

export interface ProgressBarProps {
    progress: number;
    minimum?: number;
    maximum?: number;
    variant?: ProgressBarVariant;
    override?: {
        default?: ProgressBarOverride;
        [key: string]: ProgressBarOverride | undefined;
    };
    labelledBy?: string;
}
