import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const collapsibleChannelListSettings = definePluginSettings({
    channelListEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable Channel List collapse",
        default: true,
    },
    channelListButtonIndex: {
        type: OptionType.SLIDER,
        description: "Toolbar button position (0 to disable)",
        markers: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
        default: 2,
        stickToMarkers: true,
    },
    channelListWidth: {
        type: OptionType.NUMBER,
        description: "Channel list width in pixels",
        default: 240,
    },
    channelListResizable: {
        type: OptionType.BOOLEAN,
        description: "Enable channel list resizing",
        default: true,
    },
});
