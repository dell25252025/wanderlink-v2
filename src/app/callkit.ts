
import { registerPlugin } from '@capacitor/core';

export interface CallKitPlugin {
  showIncomingCall(options: {
    callerName: string;
    callerPhotoUrl?: string;
    channelId: string;
  }): Promise<void>;

  dismissCall(): Promise<void>;
}

const CallKit = registerPlugin<CallKitPlugin>('CallKit');

export default CallKit;
