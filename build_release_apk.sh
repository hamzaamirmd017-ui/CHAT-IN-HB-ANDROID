#!/usr/bin/env bash
set -e

echo "=== Setting Environment Variables ==="
export JAVA_HOME=/opt/jdk-17
export ANDROID_HOME=/opt/android-sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:/opt/gradle/gradle-8.5/bin:$PATH

echo "=== Verifying Tools ==="
java -version
gradle -v

echo "=== Configuring local.properties ==="
echo "sdk.dir=/opt/android-sdk" > android/local.properties
echo "sdk.dir=/opt/android-sdk" > local.properties

echo "=== Ensuring Keystore ==="
if [ ! -f "android/app/release.keystore" ]; then
    keytool -genkeypair -v -keystore android/app/release.keystore -alias chatinhb -keyalg RSA -keysize 2048 -validity 10000 -storepass chatinhbpass -keypass chatinhbpass -dname "CN=ChatInHB, OU=App, O=ChatInHB, L=City, ST=State, C=US"
fi

echo "=== Building Release APK from android/ ==="
cd android
gradle assembleRelease --stacktrace --no-daemon

echo "=== Locating Built APK ==="
cd ..
RELEASE_APK=$(find android/app/build/outputs/apk/release -name "*.apk" 2>/dev/null | head -n 1)

if [ -z "$RELEASE_APK" ]; then
    RELEASE_APK=$(find android/build/outputs/apk/release -name "*.apk" 2>/dev/null | head -n 1)
fi

if [ -z "$RELEASE_APK" ]; then
    RELEASE_APK=$(find . -name "*.apk" 2>/dev/null | head -n 1)
fi

if [ -n "$RELEASE_APK" ] && [ -f "$RELEASE_APK" ]; then
    echo "Found APK at: $RELEASE_APK"
    cp "$RELEASE_APK" app-release.apk
    cp "$RELEASE_APK" android/app-release.apk
    echo "COPIED_TO_ROOT: app-release.apk"
    echo "COPIED_TO_ANDROID: android/app-release.apk"
    ls -lh app-release.apk android/app-release.apk
    echo "BUILD_COMPLETE_SUCCESS"
else
    echo "BUILD_COMPLETE_FAILED: No APK generated"
    exit 1
fi
