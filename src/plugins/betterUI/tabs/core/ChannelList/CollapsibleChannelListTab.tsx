import "../../../styles.css";

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { SettingsTab, wrapTab } from "@components/settings";
import { OptionComponentMap } from "@components/settings/tabs/plugins/components";
import { debounce } from "@shared/debounce";
import { OptionType } from "@utils/types";
import { TabBar, useState } from "@webpack/common";

import { collapsibleChannelListSettings } from "../../../settings/ChannelList/CollapsibleChannelListSettings";

const CollapsibleChannelListTabs = [
    { id: "uiSettings", label: "Settings"},
    { id: "uiKeybind", label: "Collapse on Keybind"},
];

type TabId = typeof CollapsibleChannelListTabs[number]["id"];

const CollapsibleChannelListComponents: Record<TabId, React.ComponentType> = {
    uiSettings: UISettingsTab,
    uiKeybind: UIKeybindTab
    //animations: AnimationsTab,
};

function UIKeybindTab() {
    return (
        null
    );
}

export function CollapsibleChannelListTab() {
    const [currentTab, setCurrentTab] = useState<TabId>("uiSettings");
    const TabComponent = CollapsibleChannelListComponents[currentTab];

    return (
        <SettingsTab>
            <TabBar
                type="top"
                look="brand"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
                className="vc-betterui-tabbar"
            >
                {CollapsibleChannelListTabs.map(tab => (
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

function UISettingsTab() {
    const pluginName = "BetterUI";
    collapsibleChannelListSettings.pluginName ||= pluginName;
    const pluginSettings = useSettings([`plugins.${pluginName}.*`]).plugins[pluginName];

    const options = Object.entries(collapsibleChannelListSettings.def).map(([key, setting]) => {
        const Component = OptionComponentMap[setting.type];

        return (
            <ErrorBoundary noop key={key}>
                <Component
                    id={key}
                    option={setting}
                    onChange={debounce(newValue => {
                        const option = collapsibleChannelListSettings.def[key];
                        if (!option || option.type === OptionType.CUSTOM) return;

                        pluginSettings[key] = newValue;
                    })}
                    pluginSettings={pluginSettings}
                    definedSettings={collapsibleChannelListSettings}
                />
            </ErrorBoundary>
        );
    });

    return (
        <div className="vc-plugins-settings">
            {options}
        </div>
    );
}

export default wrapTab(CollapsibleChannelListTab, "CollapsibleChannelListTab");
