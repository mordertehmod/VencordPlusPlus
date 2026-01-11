import { findComponentByCodeLazy } from "@webpack";

import { useState } from "@webpack/common";
import { CollapsibleChannelListTab } from "./ChannelList/CollapsibleChannelListTab";

export const ManaSelect = findComponentByCodeLazy('"data-mana-component":"select"') as React.ComponentType<ManaSelectProps>;

export interface ManaSelectOption {
    id: string;
    value: string;
    label: string;
}

export interface ManaSelectProps {
    options: ManaSelectOption[];
    value?: string | string[] | null;
    onSelectionChange?: (value: string | string[] | null) => void;
    selectionMode?: "single" | "multiple";
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    clearable?: boolean;
    fullWidth?: boolean;
    autoFocus?: boolean;
    closeOnSelect?: boolean;
    shouldFocusWrap?: boolean;
    maxOptionsVisible?: number;
    wrapTags?: boolean;
}

const UIElements: ManaSelectOption[] = [
    { id: "serverList", value: "openServerListUI", label: "Server List"},
    { id: "channelList", value: "openChannelListUI", label: "Channel List"},
    { id: "memberList", value: "openMemberListUI", label: "Member List"},
    { id: "userProfile", value: "openUserProfileUI", label: "User Profile"},
    { id: "messageInput", value: "openMessageInputUI", label: "Message Input"},
    { id: "windowBar", value: "openWindowBarUI", label: "Window Bar"},
    { id: "callWindow", value: "openCallWindowUI", label: "Call Window"},
    { id: "userArea", value: "openUserAreaUI", label: "User Area"},
    { id: "searchPanel", value: "openSearchPanelUI", label: "Search Panel"},
    { id: "forumPopout", value: "openForumPopoutUI", label: "Forum Popout"},
    { id: "activityPanel", value: "openActivityPanelUI", label: "Activity Panel"},
];

const UIComponentMap: Record<string, React.ComponentType> = {
    openChannelListUI: CollapsibleChannelListTab,
};

export function UIElementTab() {
    const [selectedElement, setSelectedElement] = useState<string | null>(null);

    const SelectedComponent = selectedElement ? UIComponentMap[selectedElement] : null;

    return (
        <div>
            <ManaSelect
                options={UIElements}
                value={selectedElement}
                onSelectionChange={value => {
                    setSelectedElement(value as string);
                }}
                closeOnSelect={true}
                selectionMode="single"
                placeholder="Please select a UI Element to configure"
                fullWidth
            />

            <div style={{ marginTop: "16px" }}>
                {SelectedComponent ? (
                    <SelectedComponent />
                ) : (
                    <div style={{
                        padding: "20px",
                        textAlign: "center",
                        color: "var(--text-muted)"
                    }}>
                        Select a UI element from the dropdown above to configure its settings
                    </div>
                )}
            </div>
        </div>
    );
}

function openCorrespondingUITab(value: string) {
    console.log(`value passed is ${value}`);

    switch(value) {
        case "openServerListUI":

        case "openChannelListUI":
            CollapsibleChannelListTab();
        case "openMemberListUI":
        case "openUserProfileUI":
        case "openMessageInputUI":
        case "openWindowBarUI":
        case "openCallWindowUI":
        case "openUserAreaUI":
        case "openSearchPanelUI":
        case "openForumPopoutUI":
        case "openActivityPanelUI":
            console.log(`function to call ${value}();`);
            break;
    }
}
