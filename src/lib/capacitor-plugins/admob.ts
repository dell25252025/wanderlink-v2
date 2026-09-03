import { registerPlugin } from '@capacitor/core';

export interface AdMobPlugin {
  showBanner(): Promise<void>;
  hideBanner(): Promise<void>;
}

const AdMob = registerPlugin<AdMobPlugin>('AdMob');

export default AdMob;
