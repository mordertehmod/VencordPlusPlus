/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { GithubIcon, WebsiteIcon } from "@components/Icons";

interface Props {
    text: string;
    href: string;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

export function WebsiteButton({ text, href, onMouseEnter, onMouseLeave }: Props) {
    return (
        <Button variant="secondary" size="small" style={{ gap: 4 }} onClick={() => VencordNative.native.openExternal(href)} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <WebsiteIcon width={16} height={16} />
            {text}
        </Button>
    );
}

export function GithubButton({ text, href, onMouseEnter, onMouseLeave }: Props) {
    return (
        <Button variant="secondary" size="small" style={{ gap: 4 }} onClick={() => VencordNative.native.openExternal(href)} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <GithubIcon width={16} height={16} />
            {text}
        </Button>
    );
}
