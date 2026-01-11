import "../../styles.css";

import { TabBar, useState } from "@webpack/common";
import { SettingsTab, wrapTab } from "@components/settings";

import CollapsibleChannelListTabs from "./ChannelList/CollapsibleChannelListTab";

const CollapsibleUITab = [
    { id: "collapsibleChannelList", label: "Collapse Channel List"},
    { id: "collapsibleMessageInput", label: "Collapse Message Input"},
    { id: "collapsibleServerList", label: "Collapse Server List"},
    { id: "collapsibleUserAreaButtons", label: "Collapse User Area"},
].sort((a, b) => a.label.localeCompare(b.label));

type TabId = typeof CollapsibleUITab[number]["id"];

const CollapsibleUIComponents: Record<TabId, React.ComponentType> = {
    collapsibleChannelList: CollapsibleChannelListTabs,
    collapsibleMessageInput: CollapsibleUserMessageInputTab,
    collapsibleServerList: CollapsibleServerListTab,
    collapsibleUserAreaButtons: CollapsibleUserAreaButtonsTab,
    //animations: AnimationsTab,
};

function CollapsibleUserAreaButtonsTab() {
    return (
        null
    );
}

function CollapsibleUserMessageInputTab() {
    return (
        null
    );
}

function CollapsibleServerListTab() {
    return (
        null
    );
}

function CollapsibleChannelListTab() {
    return (
        null
    );
}

export function CollapsibleTab() {

    const [currentTab, setCurrentTab] = useState<TabId>("collapsibleChannelList");
    const TabComponent = CollapsibleUIComponents[currentTab];
    return (
        <SettingsTab>
            <TabBar
                type="top"
                look="brand"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
                className="vc-betterui-tabbar"
            >
                {CollapsibleUITab.map(tab => (
                    <TabBar.Item key={tab.id} id={tab.id} className="vc-betterui-tab">
                        {tab.label}
                    </TabBar.Item>
                ))}
            </TabBar>
            <div>
                <TabComponent />
            </div>
        </SettingsTab>
    );
}

export default wrapTab(CollapsibleTab, "CollapsibleUITab");
