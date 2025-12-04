import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
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
