package com.wanderlink.nativeaudio;

import com.getcapacitor.Logger;

public class NativeAudio {

    public String echo(String value) {
        Logger.info("Echo", value);
        return value;
    }
}
