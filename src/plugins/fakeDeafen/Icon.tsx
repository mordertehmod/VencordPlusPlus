export function FakeDeafenIcon({ isActive }: { isActive: boolean }) {
    return (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
                d="M5.274 5.876c0.396-0.89 0.744-1.934 1.611-2.476 4.086-2.554 8.316 1.441 7.695 5.786-0.359 2.515-3.004 3.861-4.056 5.965-0.902 1.804-4.457 3.494-4.742 0.925"
                stroke={isActive ? "var(--status-danger)" : "currentColor"}
                strokeOpacity={0.9}
                strokeWidth={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M11.478 11.931c2.111-2.239 1.579-7.495-1.909-7.337-2.625 0.119-2.012 3.64-1.402 4.861"
                stroke={isActive ? "var(--status-danger)" : "currentColor"}
                strokeOpacity={0.9}
                strokeWidth={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M7.636 7.755c2.796-0.194 3.747 2.749 1.933 4.563-0.472 0.472-1.386-0.214-1.933 0.06-0.547 0.274-0.957 1.136-1.497 0.507"
                stroke={isActive ? "var(--status-danger)" : "currentColor"}
                strokeOpacity={0.9}
                strokeWidth={0.8}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {isActive && (
                <path
                    d="M19 1L1 19"
                    stroke="var(--status-danger)"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                />
            )}
        </svg>
    );
}
