import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, showToast, Toasts ,VoiceActions } from "@webpack/common";

import { FakeDeafenIcon } from "./Icon";
import { settings } from "./settings";
import { addSettingsPanelButton, addVoicePanelButton, removeVoicePanelButton, removeSettingsPanelButton } from "@plugins/philsPluginLibraryVisualRefresh";

let isFakeDeafened = false;
const listeners = new Set<() => void>();

export type ButtonLocation = "settingsPanel" | "voicePanel" | "both";

export function useFakeDeafen() {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => fakeDeafenStore.subscribe(forceUpdate), []);
    return fakeDeafenStore.enabled;
}

function toggleDeafen() {
    try {
        VoiceActions.toggleSelfDeaf();
        return true;
    } catch (error) {
        showToast(`Failed to toggle deafen state. Error: ${error}`, Toasts.Type.FAILURE);
        return false;
    }
}

function toggleMute() {
    try {
        VoiceActions.toggleSelfMute();
        return true;
    } catch (error) {
        showToast(`Failed to toggle mute state. Error: ${error}`, Toasts.Type.FAILURE);
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
    removeSettingsPanelButton("FakeDeafen");
    removeVoicePanelButton("FakeDeafen");

    switch (location) {
        case "settingsPanel":
            addSettingsPanelButton(panelButton());
            break;
        case "voicePanel":
            addVoicePanelButton(panelButton());
            break;
        case "both":
            addSettingsPanelButton(panelButton());
            addVoicePanelButton(panelButton());
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
