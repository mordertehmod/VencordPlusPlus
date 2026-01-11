import "../styles.css";

import { Heading } from "@components/Heading";
import { SettingsTab, wrapTab } from "@components/settings";
import { Margins } from "@utils/margins";
import { TabBar, useState } from "@webpack/common";

import CollapsibleTab from "./core/CollapsibleTab";
import ResizeUITab from "./core/ResizeUiTab";
import { UIElementTab } from "./core/UIElementsTab";

const BetterUITabs = [
    { id: "uiElements", label: "UI Elements" },
    { id: "toolbarButtons", label: "Toolbar Buttons" },
];

type TabId = typeof BetterUITabs[ number ][ "id" ];

const BetterUIComponents: Record<TabId, React.ComponentType> = {
    uiElements: UIElementTab,
    toolbarButtons: ResizeUITab,
    //animations: AnimationsTab,
};

function BetterUITab()
{
    const [ currentTab, setCurrentTab ] = useState<TabId>( "uiElements" );
    const TabComponent = BetterUIComponents[ currentTab ];

    return (
        <SettingsTab>
            <Heading className={ Margins.bottom16 }>UI Components</Heading>
            <TabBar
                type="top"
                look="brand"
                selectedItem={ currentTab }
                onItemSelect={ setCurrentTab }
                className="vc-betterui-tabbar"
            >
                { BetterUITabs.map( tab => (
                    <TabBar.Item key={ tab.id } id={ tab.id } className="vc-betterui-tab">
                        { tab.label }
                    </TabBar.Item>
                ) ) }
            </TabBar>
            <div>
                <TabComponent />
            </div>
        </SettingsTab>
    );
}

export default wrapTab( BetterUITab, "BetterUITab" );
