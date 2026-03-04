export interface NativeAudioPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
}
