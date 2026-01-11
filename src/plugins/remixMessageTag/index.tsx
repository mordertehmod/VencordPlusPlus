/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreSendListener, MessageSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const handleMessage: MessageSendListener = (_, __, ex) => ex.uploads && ex.uploads.forEach(att => att.isRemix = true);

export default definePlugin({
    name: "RemixMessageTags",
    description: "Turns every single message with attachment to have remix tag",
    authors: [Devs.LSDZaddi],
    start() {
        addMessagePreSendListener(handleMessage);
    },
    stop() {
        removeMessagePreSendListener(handleMessage);
    }
});
