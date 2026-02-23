import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { fakeDeafenButton, type ButtonLocation } from ".";

export const settings = definePluginSettings({
    buttonLocation: {
        type: OptionType.SELECT,
        description: "Where to show the Fake Deafen button",
        options: [
            { label: "Above your avatar", value: "settingsPanel", default: true },
            { label: "Beside your avatar", value: "voicePanel", default: false },
            { label: "Both", value: "both", default: false },
        ],
        onChange: (value: ButtonLocation) => fakeDeafenButton(value)
    },
    muteUponFakeDeafen: {
        type: OptionType.BOOLEAN,
        description: "Also mute when enabling fake deafen",
        default: false
    },
    mute: {
        type: OptionType.BOOLEAN,
        description: "Send muted state as true when fake deafened",
        default: true
    },
    deafen: {
        type: OptionType.BOOLEAN,
        description: "Send deafened state as true when fake deafened",
        default: true
    },
    cam: {
        type: OptionType.BOOLEAN,
        description: "Send video state as false when fake deafened",
        default: false
    }
});
