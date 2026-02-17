/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/index";
import definePlugin, { OptionType } from "@utils/types";
import { Activity } from "@vencord/discord-types";
import { PresenceStore, UserStore } from "@webpack/common";


const settings = definePluginSettings({
    clipAllStreams: {
        description: "Allows clipping on all streams regardless of the streamer's settings.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    clipAllParticipants: {
        description: "Allows recording of all voice call participants regardless of their settings.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    moreClipSettings: {
        description: "Adds more FPS and duration options in settings.",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    },
    ignorePlatformRestriction: {
        type: OptionType.BOOLEAN,
        description: "Allow Platform Restricted Clipping (may cause save errors)",
        default: true,
        restartNeeded: true
    },
    enableAdvancedSignals: {
        type: OptionType.BOOLEAN,
        description: "Enable advanced clip signals (auto-clip triggers)",
        default: true,
        restartNeeded: true
    },
    richPresenceTagging: {
        type: OptionType.SELECT,
        description: "When should clips be tagged with the current Rich Presence?",
        options: [
            { label: "Always", value: "always" },
            { label: "Only when beginning or end of activity name matches", value: "whenMatched", default: true },
            { label: "Never", value: "never" },
        ]
    },
    enableScreenshotKeybind: {
        type: OptionType.BOOLEAN,
        description: "Enable the screenshot keybind feature",
        default: true,
        restartNeeded: true
    },
    enableVoiceOnlyClips: {
        type: OptionType.BOOLEAN,
        description: "Enable voice-only clips (audio without video)",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "BetterClips",
    authors: [Devs.Joona, Devs.LSDZaddi, Devs.niko],
    description: "Enables extra clipping options for streams.",
    settings,
    patches: [
        {
            predicate: () => settings.store.clipAllStreams,
            find: "}isViewerClippingAllowedForUser",
            replacement: {
                match: /isViewerClippingAllowedForUser\(\w+\){/,
                replace: "$&return true;"
            }
        },
        {
            predicate: () => settings.store.clipAllParticipants,
            find: "}isVoiceRecordingAllowedForUser",
            replacement: {
                match: /isVoiceRecordingAllowedForUser\(\w+\){/,
                replace: "$&return true;"
            }
        },
        {
            find: ".CLIPS_FRAME_RATE,{",
            replacement: {
                match: /\[\{.{0,25}\i.\i.FPS_15.{0,500}\}\]/,
                replace: "$self.patchFramerates($&)"
            }
        },
        {
            find: ".CLIPS_LENGTH,{",
            replacement: {
                match: /\[\{.{0,25}\i.\i.SECONDS_30.{0,500}\}\]/,
                replace: "$self.patchDurations($&)"
            }
        },
        // enables clips
        {
            find: "2022-11_clips_experiment",
            replacement: {
                match: /defaultConfig:\{enableClips:!\d,ignorePlatformRestriction:!\d,showClipsHeaderEntrypoint:!\d,enableScreenshotKeybind:!\d,enableVoiceOnlyClips:!\d,enableAdvancedSignals:!\d\}/,
                replace: "defaultConfig:{enableClips:!0,ignorePlatformRestriction:$self.settings.store.ignorePlatformRestriction,showClipsHeaderEntrypoint:!0,enableScreenshotKeybind:$self.settings.store.enableScreenshotKeybind,enableVoiceOnlyClips:$self.settings.store.enableVoiceOnlyClips,enableAdvancedSignals:$self.settings.store.enableAdvancedSignals}"
            }
        },
        {
            find: "2023-10_viewer_clipping",
            replacement: {
                match: /defaultConfig:\{enableViewerClipping:!\d,ignoreSenderPreference:!\d\}/,
                replace: "defaultConfig:{enableViewerClipping:!0,ignoreSenderPreference:!0}"
            }
        },
        {
            find: "#{intl::CLIPS_UNKNOWN_SOURCE}",
            replacement: {
                match: /(applicationName:)(.{0,50})(,applicationId:)(\i)/,
                replace: "$1$2$3$self.getApplicationId($2)??$4"
            }
        }
    ],

    patchDurations(durations: { id: string; value: number; label: string; }[]) {
        const newDurations = [...durations];
        const extraDurations = [3, 4, 5, 6, 7, 10, 15, 20, 25, 30];

        extraDurations.forEach(duration => newDurations.push({
            id: `${duration}min`,
            value: duration * 60000,
            label: getIntlMessage("CLIPS_LENGTH_MINUTES", {
                count: duration
            })
        }));

        return newDurations.sort((a, b) => a.value - b.value);;
    },

    patchFramerates(framerates: { id: string; value: number; label: string; }[]) {
        const newFramerates = [...framerates];
        const extraFramerates = [45, 90, 120, 144, 165, 240];

        extraFramerates.forEach(framerate => newFramerates.push({
            id: `${framerate}fps`,
            value: framerate,
            label: getIntlMessage("SCREENSHARE_FPS_ABBREVIATED", {
                fps: framerate
            })
        }));

        return newFramerates.sort((a, b) => a.value - b.value);
    },

    getApplicationId(activityName: string) {
        if (settings.store.richPresenceTagging === "never") return null;

        const activities: Activity[] = PresenceStore.getActivities(UserStore.getCurrentUser().id);
        const validActivities = activities.filter(activity => activity.type === 0 && activity.application_id !== null);
        const splitName = activityName.split(" ");

        const matchedActivities = validActivities.filter(activity => activity.name.endsWith(splitName.at(-1)!) || activity.name.startsWith(splitName.at(0)!));

        if (matchedActivities.length > 0)
            return matchedActivities[0].application_id;

        if (settings.store.richPresenceTagging !== "whenMatched")
            return validActivities[0]?.application_id ?? null;

        return null;
    },
});
