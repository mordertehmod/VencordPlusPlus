/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { renderVoicePanelButtons } from "@plugins/philsPluginLibraryVisualRefresh";
import { replacedUserPanelComponent } from "@plugins/philsPluginLibraryVisualRefresh/patches";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const plugin = definePlugin({
    name: "PhilsPluginLibraryVisualRefresh",
    description: "A library for phil's plugins",
    authors: [Devs.philhk, Devs.LSDZaddi],
    patches: [
        {
            find: '"--custom-app-panels-height",',
            replacement: {
                match: /(\(0,\s*\w+\.\w+\)\(\w+(?:\.\w+)?\s*,\s*\{\s*section:\s*\w+\.\w+\.ACCOUNT_PANEL\b)/,
                replace: "$self.replacedUserPanelComponent(),$1"
            }
        },
        {
            find: ".DISPLAY_NAME_STYLES_COACHMARK),",
            replacement: {
                match: /speaking:.{0,100}style:.,children:\[/,
                replace: "$&$self.renderVoicePanelButtons(arguments[0]),"
            }
        },
        {
            find: "Unknown frame rate",
            replacement: [
                {
                    match: /(switch\((.{0,10})\).{0,1000})(throw Error\(.{0,100}?Unknown resolution.{0,100}?\))(?=})/,
                    replace: "$1return $2"
                },
                {
                    match: /(switch\((.{0,10})\).{0,1000})(throw Error\(.{0,100}?Unknown frame rate.{0,100}?\))(?=})/,
                    replace: "$1return $2"
                }
            ]
        }
    ],
    replacedUserPanelComponent,
    renderVoicePanelButtons
});

export default plugin;

export * from "./components";
export * from "./discordModules";
export * from "./emitter";
export * from "./icons";
export * from "./patchers";
export * from "./patches";
export * from "./store";
export * as types from "./types";
export * from "./utils";
