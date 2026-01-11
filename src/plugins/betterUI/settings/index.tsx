import { collapsibleChannelListSettings } from "./ChannelList/CollapsibleChannelListSettings";

import { SettingsManager } from "../utils/SettingsManager";

export function initSettings() {
    const settingsManager = new SettingsManager("BetterUI");

    settingsManager.initialize(collapsibleChannelListSettings)
}
