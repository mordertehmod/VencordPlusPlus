import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { React, showToast, Toasts ,VoiceActions } from "@webpack/common";

import { FakeDeafenIcon } from "./Icon";
import { settings } from "./settings";

// TODO: Fix this shit fully later

let isFakeDeafened = false;
const listeners = new Set<() => void>();
const Button = findComponentByCodeLazy("tooltipPositionKey", "positionKeyStemOverride")

function useFakeDeafen() {
    const [, forceUpdate] = React.useReducer(x => x + 1, 0);
    React.useEffect(() => fakeDeafenStore.subscribe(forceUpdate), []);
    return fakeDeafenStore.enabled;
}

function getElementByXpath(path: string): HTMLElement | null {
    const result = document.evaluate(path, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue as HTMLElement | null;
}

function toggleDeafen() {
    try {
        VoiceActions.toggleSelfDeaf();
        return true;
    } catch (error) {
        showToast(`Failed to toggle deafen state. Error: ${error}`, Toasts.Type.FAILURE);
    }

    // Fallback methods
    const deafenButtonClass = document.querySelector('[aria-label="Deafen"]') as HTMLElement;
    const xPathDeafenButton = getElementByXpath('//*[@id="app-mount"]/div[3]/div/div[1]/div/div[2]/div/div/div/div[2]/div[1]/section/div[2]/div[3]/button[2]');

    try {
        if (deafenButtonClass) {
            deafenButtonClass.click();
            return true;
        }
    } catch (error) {
        showToast(`Failed to toggle deafen state via aria-label. Error: ${error}`, Toasts.Type.FAILURE);
    } finally {
        if (xPathDeafenButton) {
            xPathDeafenButton.click();
            return true;
        }
    }
    showToast("Failed to toggle deafen state via all methods.", Toasts.Type.FAILURE);

    console.error(`[FakeDeafen] toggleDeafen results:\n
        VoiceActions: Failed\n
        Aria-label method: ${deafenButtonClass ? "Success" : "Failed"}\n
        XPATH method: ${xPathDeafenButton ? "Success" : "Failed"}`);
    return false;
}

function toggleMute() {
    try {
        VoiceActions.toggleSelfMute();
        return true;
    } catch (error) {
        showToast(`Failed to toggle mute state. Error: ${error}`, Toasts.Type.FAILURE);
    }

    // Fallback methods
    const muteButtonClass = document.querySelector('[aria-label="Mute"]') as HTMLElement;
    const xPathMuteButton = getElementByXpath('//*[@id="app-mount"]/div[3]/div/div[1]/div/div[2]/div/div/div/div[2]/div[1]/section/div[2]/div[3]/div/button');

    try {
        if (muteButtonClass) {
            muteButtonClass.click();
            return true;
        }
    } catch (error) {
        showToast(`Failed to toggle mute state via aria-label. Error: ${error}`, Toasts.Type.FAILURE);
    } finally {
        if (xPathMuteButton) {
            xPathMuteButton.click();
            return true;
        }
    }
    showToast("Failed to toggle mute state via all methods.", Toasts.Type.FAILURE);

    console.error(`[FakeDeafen] toggleMute results:\n
        VoiceActions: Failed\n
        Aria-label method: ${muteButtonClass ? "Success" : "Failed"}\n
        XPATH method: ${xPathMuteButton ? "Success" : "Failed"}`);
    return false;
}

export const fakeDeafenStore = {
    get enabled() { return isFakeDeafened; },

    toggle() {
        isFakeDeafened = !isFakeDeafened;

        const fakeDeafenResult = toggleDeafen();
        setTimeout(() => toggleDeafen(), 250);

        if (fakeDeafenResult) showToast(isFakeDeafened ? "Fake Deafen enabled" : "Fake Deafen disabled", Toasts.Type.SUCCESS );

        if (isFakeDeafened && settings.store.muteUponFakeDeafen) {
            const mutedAfterDeafen = setTimeout(() => toggleMute(), 300);
            if (mutedAfterDeafen) showToast("Successfully muted after Fake Deafen", Toasts.Type.SUCCESS );
        }

        listeners.forEach(l => l());
    },
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    }
}

function fakeDeafenToggleButton() {
    const isActive = useFakeDeafen();

    return (
        <Button
            tooltipText="Fake Deafen"
            icon={() => <FakeDeafenIcon isActive={isActive} />}
            role="switch"
            aria-checked={!isActive}
            onClick={() => fakeDeafenStore.toggle()}
        />
    );
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

    userAreaButton: {
        icon: () => <FakeDeafenIcon isActive={useFakeDeafen()} />,
        render: fakeDeafenToggleButton
    },

    toggle(actual: boolean, type: string) {
        if (!isFakeDeafened) return actual;
        switch (type) {
            case "mute": return settings.store.mute;
            case "deaf": return settings.store.deafen;
            case "video": return settings.store.cam;
            default: return actual;
        }
    },

    fakeDeafenStore,
});
