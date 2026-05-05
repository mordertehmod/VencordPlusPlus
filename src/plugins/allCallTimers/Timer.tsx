/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useFixedTimer } from "@utils/react";
import { formatDurationMs } from "@utils/text";
import { Tooltip, useEffect } from "@webpack/common";

import { injectCSS, settings } from "./index";
import { TimerIcon } from "./TimerIcon";
import { TimerText } from "./timerText";

export function Timer({ time, defaultColorClassName, defaultStyle }: Readonly<{ time: number; defaultColorClassName?: string; defaultStyle?: React.CSSProperties; }>) {
    const durationMs = useFixedTimer({ initialTime: time });
    const formatted = formatDurationMs(durationMs, settings.store.format === "human", settings.store.showSeconds);
    const finalColorClassName = settings.store.showRoleColor ? defaultColorClassName || "" : "";

    useEffect(() => {
        if (settings.store.fixUI) injectCSS();
    }, []);

    if (settings.store.showWithoutHover) {
        return <TimerText text={formatted} className={finalColorClassName} style={defaultStyle} />;
    } else {
        return (
            <Tooltip text={formatted}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        role="tooltip"
                    >
                        <TimerIcon />
                    </div>
                )}
            </Tooltip>
        );
    }
}
