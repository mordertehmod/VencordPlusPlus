/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "HeaderBarAPI",
    description: "API to add buttons to the header bar.",
    authors: [Devs.LSDZaddi],

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?<=\i\.Fragment,\{children:\[.{1,500}className:\i\}\))(?=\])/,
                replace: ",...Vencord.Api.HeaderBar._addButtons()"
            }
        }
    ]
});
