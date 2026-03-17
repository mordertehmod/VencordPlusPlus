import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { copyErrorWithToast } from "@utils/discord";
import { React, showToast, Toasts ,VoiceActions } from "@webpack/common";
import { Logger } from "@utils/Logger";

import { FakeDeafenIcon } from "./Icon";
import { settings } from "./settings";
import { addSettingsPanelButton, addVoicePanelButton, removeVoicePanelButton, removeSettingsPanelButton } from "@plugins/philsPluginLibraryVisualRefresh";

let isFakeDeafened = false;
const listeners = new Set<() => void>();

export type ButtonLocation = "settingsPanel" | "voicePanel" | "both";
export const logger = new Logger("FakeDeafen");

export function useFakeDeafen() {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => fakeDeafenStore.subscribe(forceUpdate), []);
    return fakeDeafenStore.enabled;
}

function toggleDeafen() {
    try {
        VoiceActions.toggleSelfDeaf();
        showToast(isFakeDeafened ? "FakeDeafen: Enabled" : "FakeDeafen: Disabled", Toasts.Type.SUCCESS);
        return true;
    } catch (error) {
        if (settings.store.debug) {
            if (settings.store.copyErrorToClipboard) {
                copyErrorWithToast(error, "Error copied to clipboard. Please report in VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
            } else {
                showToast(`Failed to toggle deafen state. Please copy the error in console and report in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible`, Toasts.Type.FAILURE);
                logger.error("Failed to toggle deafen state", error);
                logger.error("Please report this in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
            }
        }
        return false;
    }
}

function toggleMute() {
    try {
        VoiceActions.toggleSelfMute();
        showToast(isFakeDeafened ? "FakeDeafen + Mute: Enabled" : "FakeDeafen + Mute: Disabled", Toasts.Type.SUCCESS);
        return true;
    } catch (error) {
        if (settings.store.debug) {
            if (settings.store.copyErrorToClipboard) {
                copyErrorWithToast(error, "Error copied to clipboard. Please report in VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
            } else {
                showToast(`Failed to toggle mute state. Please copy the error in console and report in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible`, Toasts.Type.FAILURE);
                logger.error("Failed to toggle mute state", error);
                logger.error("Please report this in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
            }
        }
        return false;
    }
}

export const fakeDeafenStore = {
    get enabled() { return isFakeDeafened; },

    toggle() {
        isFakeDeafened = !isFakeDeafened;

        const fakeDeafenResult = toggleDeafen();
        setTimeout(() => toggleDeafen(), 250);

        if (fakeDeafenResult)
            showToast(isFakeDeafened ? "Fake Deafen enabled" : "Fake Deafen disabled", Toasts.Type.SUCCESS );

        if (isFakeDeafened && settings.store.muteUponFakeDeafen) {
            setTimeout(() => {
                if (toggleMute())
                    showToast("Successfully muted after Fake Deafen", Toasts.Type.SUCCESS );
            }, 300);
        }

        listeners.forEach(l => l());
    },

    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }
}

const panelButton = () => ({
    name: "FakeDeafen",
    icon: () => <FakeDeafenIcon isActive={useFakeDeafen()} />,
    tooltipText: "Fake Deafen",
    onClick: () => fakeDeafenStore.toggle()
});

export function fakeDeafenButton(location?: ButtonLocation) {
    // I'll update this to be more efficient later, for now this is fine since it's only on settings change which isn't often
    if (settings.store.debug) logger.log("[fakeDeafenButton()] - Updating FakeDeafen button location");
    try {
        removeSettingsPanelButton("FakeDeafen");
        if (settings.store.debug) {
            showToast("Removed existing button from settings panel", Toasts.Type.SUCCESS);
            logger.log("[fakeDeafenButton()] - Removed existing button from settings panel");
        }
        try {
            removeVoicePanelButton("FakeDeafen");
            if (settings.store.debug) {
                showToast("Removed existing button from voice panel", Toasts.Type.SUCCESS);
                logger.log("[fakeDeafenButton()] - Removed existing button from voice panel");
            }
        } catch (error) {
            if (settings.store.debug) {
                showToast("Failed to remove existing button from voice panel. Please copy the error in console and report in VencordPlusPlus server if you see this, but it should be fine to ignore", Toasts.Type.FAILURE);
                logger.error("[fakeDeafenButton()] - Failed to remove existing button from voice panel, this may be because it wasn't added to the voice panel in the first place, so it should be fine to ignore", error);
            }
        }
    } catch (error) {
        if (settings.store.debug) {
            if (settings.store.copyErrorToClipboard) {
                copyErrorWithToast(error, "Error copied to clipboard. Please report in VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
            } else {
                showToast("Failed to remove existing button from settings panel. Please copy the error in console and report in VencordPlusPlus server if you see this, but it should be fine to ignore", Toasts.Type.FAILURE);
                logger.error("[fakeDeafenButton()] - Failed to remove existing button from settings panel", error);
                logger.error("[fakeDeafenButton()] - This is likely because there was no existing button, so it should be fine to ignore");
            }
        }
    }

    switch (location) {
        case "settingsPanel":
            if (settings.store.debug) logger.log("[fakeDeafenButton()] - Adding button to settings panel");
            try {
                addSettingsPanelButton(panelButton());
                if (settings.store.debug) {
                    showToast("Button added to settings panel", Toasts.Type.SUCCESS);
                    logger.log("[fakeDeafenButton()] - Added button to settings panel");
                }
            } catch (error) {
                if (settings.store.debug) {
                    if (settings.store.copyErrorToClipboard) {
                        copyErrorWithToast(error, "Error copied to clipboard. Please report in VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
                    } else {
                        showToast("Failed to add button to settings panel. Please copy the error in console and report in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible", Toasts.Type.FAILURE);
                        logger.error("[fakeDeafenButton()] - Failed to add button to settings panel", error);
                        logger.error("[fakeDeafenButton()] - Please report this in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
                    }
                }
            }
            break;
        case "voicePanel":
            if (settings.store.debug) logger.log("[fakeDeafenButton()] - Adding button to voice panel");
            try {
                addVoicePanelButton(panelButton());
                if (settings.store.debug) {
                    showToast("Button added to voice panel", Toasts.Type.SUCCESS);
                    logger.log("[fakeDeafenButton()] - Added button to voice panel");
                }
            } catch (error) {
                if (settings.store.debug) {
                    if (settings.store.copyErrorToClipboard) {
                        copyErrorWithToast(error, "Error copied to clipboard. Please report in VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
                    } else {
                        showToast("Failed to add button to voice panel. Please copy the error in console and report in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible", Toasts.Type.FAILURE);
                        logger.error("[fakeDeafenButton()] - Failed to add button to voice panel", error);
                        logger.error("Please report this in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
                    }
                }
            }
            break;
        case "both":
            if (settings.store.debug) logger.log("[fakeDeafenButton()] - Adding buttons to both panels");
            try {
                addSettingsPanelButton(panelButton());
                if (settings.store.debug) {
                    showToast("Button added to settings panel", Toasts.Type.SUCCESS);
                    logger.log("[fakeDeafenButton()] - Added button to settings panel");
                }
            } catch (error) {
                if (settings.store.debug) {
                    if (settings.store.copyErrorToClipboard) {
                        copyErrorWithToast(error, "Error copied to clipboard. Please report in VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
                    } else {
                        showToast("Failed to add button to settings panel. Button may still be added to voice panel. Please copy the error in console and report in the VencordPlusPlus server", Toasts.Type.FAILURE);
                        logger.error("[fakeDeafenButton()] - Failed to add button to settings panel", error);
                        logger.error("[fakeDeafenButton()] - Please report this in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
                    }
                }
            }
            try {
                addVoicePanelButton(panelButton());
                if (settings.store.debug) {
                    showToast("Buttons added to voice panel", Toasts.Type.SUCCESS);
                    logger.log("[fakeDeafenButton()] - Added button to voice panel");
                }
            } catch (error) {
                if (settings.store.debug) {
                    if (settings.store.copyErrorToClipboard) {
                        copyErrorWithToast(error, "Error copied to clipboard. Please report in VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
                    } else {
                        showToast("Button added to settings panel, but failed to add to voice panel. Please copy the error in console and report in the VencordPlusPlus server", Toasts.Type.FAILURE);
                        logger.error("[fakeDeafenButton()] - Failed to add FakeDeafen button to voice panel", error);
                        logger.error("[fakeDeafenButton()] - Please report this in the VencordPlusPlus server if you see this, along with steps to reproduce and screenshots if possible");
                    }
                }
            }
            break;
        default:
            showToast("Uh... You shouldn't get this message, report it!", Toasts.Type.SUCCESS);
            break;
    }
}

export default definePlugin({
    name: "FakeDeafen",
    description: "Appear deafened to others while still hearing audio",
    authors: [Devs.philhk, Devs.LSDZaddi],
    settings,
    dependencies: ["PhilsPluginLibraryVisualRefresh"],

    patches: [
        {
            find: "}voiceStateUpdate(",
            replacement: {
                match: /self_mute:([^,]+),self_deaf:([^,]+),self_video:([^,]+)/,
                replace: "self_mute:$self.toggle($1, 'mute'),self_deaf:$self.toggle($2, 'deaf'),self_video:$self.toggle($3, 'video')"
            }
        }
    ],

    toggle(actual: boolean, type: string) {
        if (!isFakeDeafened) return actual;
        switch (type) {
            case "mute": return settings.store.mute;
            case "deaf": return settings.store.deafen;
            case "video": return settings.store.cam;
            default: return actual;
        }
    },

    start() {
        fakeDeafenButton(settings.store.buttonLocation as ButtonLocation);
    },
    stop() {
        removeSettingsPanelButton(this.name);
        removeVoicePanelButton(this.name);
    },

    fakeDeafenStore,
});
