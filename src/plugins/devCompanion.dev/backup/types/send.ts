/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// should be the same types as src/server/types/recieve.ts in the companion
//import { ReporterData as IReporterData } from "debug/reporterData";
//export type ReporterData = IReporterData;

export type OutgoingMessage = Base<DiffModule | ExtractModule | ModuleList | RawId | I18nValue | VersionResponse>;
export type FullOutgoingMessage = OutgoingMessage & Nonce;

export type Base<T> = ({
    ok: true;
} & T) | ({
    ok: false;
    data: null;
    error: string;
} & Omit<T, "data">);

export type Nonce = {
    nonce: number;
};
export type ModuleResult = {
    moduleNumber: number;
    patchedBy: string[];
};

// #region valid payloads

export type I18nValue = {
    type: "i18n";
    data: {
        value: string;
    };
};

/*
export type Report = {
    type: "report";
    data: ReporterData;
};
*/

export type DiffModule = {
    type: "diff";
    data: {
        source: string;
        patched: string;
    } & ModuleResult;
};

export type ExtractModule = {
    type: "extract";
    data: {
        module: string;
        /**
         * if the module is incomplete. ie: from a find
         */
        find?: boolean;
    } & ModuleResult;
};

export type ModuleList = {
    type: "moduleList";
    data: {
        modules: string[];
    };
};
export type RawId = {
    type: "rawId";
    data: string;
};

export type VersionResponse = {
    type: "version";
    data: {
        clientVersion: readonly [number, number, number];
    };
};
// #endregion
