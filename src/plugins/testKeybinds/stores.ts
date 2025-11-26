import { findStoreLazy } from "@webpack";

import * as t from "./types/stores";

export const ApplicationStreamingStore: t.ApplicationStreamingStore = findStoreLazy("ApplicationStreamingStore");
export const StreamRTCConnectionStore: t.StreamRTCConnectionStore = findStoreLazy("StreamRTCConnectionStore");
export const RunningGameStore: t.RunningGameStore = findStoreLazy("RunningGameStore");
export const RTCConnectionStore: t.RTCConnectionStore = findStoreLazy("RTCConnectionStore");
export const MediaEngineStore: t.MediaEngineStore = findStoreLazy("MediaEngineStore");
