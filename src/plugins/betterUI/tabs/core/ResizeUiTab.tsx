import "../../styles.css";

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { wrapTab } from "@components/settings";
import { OptionComponentMap } from "@components/settings/tabs/plugins/components";
import { debounce } from "@shared/debounce";
import { OptionType } from "@utils/types";

import { resizeUIElements } from "../../settings/ResizeUIElements";

export function ResizeUITab()
{
    const pluginName = "BetterUI";
    const pluginSettings = useSettings( [ `plugins.${pluginName}.*` ] ).plugins[ pluginName ];

    const options = Object.entries( resizeUIElements.def ).map( ( [ key, setting ] ) =>
    {
        const Component = OptionComponentMap[ setting.type ];

        return (
            <ErrorBoundary noop key={ key }>
                <Component
                    id={ key }
                    option={ setting }
                    onChange={ debounce( newValue =>
                    {
                        const option = resizeUIElements.def[ key ];
                        if ( !option || option.type === OptionType.CUSTOM ) return;

                        pluginSettings[ key ] = newValue;
                    } ) }
                    pluginSettings={ pluginSettings }
                    definedSettings={ resizeUIElements }
                />
            </ErrorBoundary>
        );
    } );

    return (
        <div className="vc-plugins-settings">
            { options }
        </div>
    );
}

export default wrapTab( ResizeUITab, "ResizeUITab" );
