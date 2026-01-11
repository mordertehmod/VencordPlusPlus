export class SettingsManager {
    private pluginName: string;

    constructor(pluginName: string) {
        this.pluginName = pluginName;
    }

    initialize(settingsDefinition: any) {
        const settingsStore = Vencord.Settings.plugins[this.pluginName];

        Object.entries(settingsDefinition.def).forEach(([key, setting]: [string, any]) => {
            if (settingsStore[key] === undefined && setting.default !== undefined) {
                settingsStore[key] = setting.default;
            }
        });
    }

    resetSetting(settingsDefinition: any, key: string) {
        const settingsStore = Vencord.Settings.plugins[this.pluginName];

        if (key) {
            const setting = settingsDefinition.def[key];
            if (setting && setting.default !== undefined) {
                settingsStore[key] = setting.default;
            }
        }
    }

    resetSettings(settingsDefinition: any) {
        const settingsStore = Vencord.Settings.plugins[this.pluginName];

        Object.entries(settingsDefinition.def).forEach(([key, setting]: [string, any]) => {
            if (setting.default !== undefined) {
                settingsStore[key] = setting.default;
            }
        });
    }

    get(key: string): any {
        return Vencord.Settings.plugins[this.pluginName][key];
    }

    set(key: string, value: any) {
        Vencord.Settings.plugins[this.pluginName][key] = value;
    }

    isModified(settingsDefinition: any, key: string): boolean {
        const settingsStore = Vencord.Settings.plugins[this.pluginName];
        const setting = settingsDefinition.def[key];

        return setting && settingsStore[key] !== setting.default;
    }
}
