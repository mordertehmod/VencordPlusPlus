const { definePluginSettings } = require("@api/Settings");
const { Devs } = require("@utils/constants");
const definePlugin = require("@utils/types").default;
const { findByPropsLazy } = require("@webpack");

const PermissionStore = findByPropsLazy(
    "can",
    "canBasicChannel",
    "canAccessGuildSettings",
    "canAccessMemberSafetyPage",
    "canImpersonateRole",
    "canManageUser",
    "canWithPartialContext",
    "isRoleHigher"
);

const UserStore = findByPropsLazy("getCurrentUser", "getUser");
const GuildStore = findByPropsLazy("getGuilds", "getGuild");

const settings = definePluginSettings({
    enabled: {
        type: 3, // OptionType.BOOLEAN = 3
        description: "Enable server access patches",
        default: true,
        restartNeeded: false
    }
});

module.exports = definePlugin({
    name: "ServerAccess",
    description: "Patches permission checks for testing purposes",
    authors: [Devs.LSDZaddi],
    settings,

    start() {
        if (!settings.store.enabled) return;

        // Store original methods
        this.originalMethods = {
            can: PermissionStore.can,
            canAccessGuildSettings: PermissionStore.canAccessGuildSettings,
            canAccessMemberSafetyPage: PermissionStore.canAccessMemberSafetyPage,
            canBasicChannel: PermissionStore.canBasicChannel,
            canImpersonateRole: PermissionStore.canImpersonateRole,
            canManageUser: PermissionStore.canManageUser,
            canWithPartialContext: PermissionStore.canWithPartialContext,
            isRoleHigher: PermissionStore.isRoleHigher
        };

        // Override permission methods
        PermissionStore.can = () => true;
        PermissionStore.canAccessGuildSettings = () => true;
        PermissionStore.canAccessMemberSafetyPage = () => true;
        PermissionStore.canBasicChannel = () => true;
        PermissionStore.canImpersonateRole = () => true;
        PermissionStore.canManageUser = () => true;
        PermissionStore.canWithPartialContext = () => true;
        PermissionStore.isRoleHigher = () => true;

        // Patch guild ownership checks
        this.patchGuildOwnership();
    },

    stop() {
        // Restore original methods
        if (this.originalMethods) {
            Object.assign(PermissionStore, this.originalMethods);
        }

        // Restore guild methods
        this.unpatchGuildOwnership();
    },

    patchGuildOwnership() {
        const guilds = GuildStore.getGuilds();
        const currentUserId = UserStore.getCurrentUser()?.id;

        this.guildPatches = new Map();

        for (const guild of Object.values(guilds)) {
            // Store originals
            this.guildPatches.set(guild.id, {
                isOwner: guild.isOwner,
                isOwnerWithRequiredMfaLevel: guild.isOwnerWithRequiredMfaLevel
            });

            // Override methods
            guild.isOwner = (id) => {
                return id === currentUserId || id === guild.ownerId;
            };

            guild.isOwnerWithRequiredMfaLevel = (id) => {
                return id === currentUserId || id === guild.ownerId;
            };
        }
    },

    unpatchGuildOwnership() {
        if (!this.guildPatches) return;

        const guilds = GuildStore.getGuilds();
        for (const guild of Object.values(guilds)) {
            const original = this.guildPatches.get(guild.id);
            if (original) {
                guild.isOwner = original.isOwner;
                guild.isOwnerWithRequiredMfaLevel = original.isOwnerWithRequiredMfaLevel;
            }
        }

        this.guildPatches && this.guildPatches.clear();
    }
});
