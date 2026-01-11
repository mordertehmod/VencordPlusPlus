import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const resizeUIElements = definePluginSettings({
    resizeChannelList: {
        type: OptionType.BOOLEAN,
        description: "Enable the ability to resize the Channel List by clicking and dragging the left edge",
        default: false,
        disabled: true,
    },
    resizeMemberList: {
        type: OptionType.BOOLEAN,
        description: "Enable the ability to resize the Member List by clicking and dragging the left edge",
        default: false,
    },
    resizeUserProfile: {
        type: OptionType.BOOLEAN,
        description: "Enable the ability to resize the User Profile in DM's by clicking and dragging the left edge",
        default: false,
    },
    resizeSearchPanel: {
        type: OptionType.BOOLEAN,
        description: "Enable the ability to resize the Search Panel by clicking and dragging the left edge",
        default: false,
    },
    resizeForumPopout: {
        type: OptionType.BOOLEAN,
        description: "Enable the ability to resize the thread popup in forum channels by clicking and dragging the left edge",
        default: false,
    },
    resizeActivityPanel: {
        type: OptionType.BOOLEAN,
        description: "Enable the ability to resize the activity panel in the friends list by clicking and dragging the left edge",
        default: false,
    },
});
