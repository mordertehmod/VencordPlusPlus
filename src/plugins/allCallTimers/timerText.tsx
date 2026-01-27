/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function TimerText({ text, className, style }: Readonly<{ text: string; className: string; style?: React.CSSProperties; }>) {
    return <div className={`timeCounter ${className}`} style={{
        fontWeight: "bold",
        fontFamily: "monospace",
        fontSize: 11,
        lineHeight: "7px",
        position: "relative",
        ...style
    }}>{text}</div>;
}
