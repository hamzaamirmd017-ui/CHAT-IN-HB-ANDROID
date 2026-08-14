#!/bin/bash
set -e

echo "=== 1. Environment Setup ==="
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:/opt/gradle/gradle-8.5/bin:$PATH

mkdir -p /opt/gradle
if [ ! -f "/opt/gradle/gradle-8.5/bin/gradle" ]; then
    echo "Downloading Gradle 8.5..."
    wget -q https://services.gradle.org/distributions/gradle-8.5-bin.zip -O /tmp/gradle-8.5-bin.zip
    unzip -q -o /tmp/gradle-8.5-bin.zip -d /opt/gradle
    rm /tmp/gradle-8.5-bin.zip
fi

mkdir -p /opt/android-sdk/cmdline-tools
if [ ! -d "/opt/android-sdk/cmdline-tools/latest" ]; then
    echo "Downloading Android Command Line Tools..."
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip
    unzip -q -o /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools
    rm -rf /opt/android-sdk/cmdline-tools/latest
    mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest
    rm /tmp/cmdline-tools.zip
fi

echo "Accepting licenses and installing Android SDK platforms..."
yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses > /dev/null 2>&1 || true
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager "platforms;android-34" "platforms;android-35" "platforms;android-36" "build-tools;34.0.0" "platform-tools" > /dev/null 2>&1

echo "sdk.dir=/opt/android-sdk" > /app/applet/android/local.properties
echo "sdk.dir=/opt/android-sdk" > /app/applet/local.properties

echo "=== 2. Running Gradle assembleRelease ==="
cd /app/applet/android
/opt/gradle/gradle-8.5/bin/gradle assembleRelease --stacktrace --no-daemon

echo "=== 3. Locating and Copying APK ==="
FOUND_APK=""
for path in app/build/outputs/apk/release/*.apk build/outputs/apk/release/*.apk; do
    if [ -f "$path" ]; then
        FOUND_APK="$path"
        break
    fi
done

if [ -n "$FOUND_APK" ]; then
    cp "$FOUND_APK" /app/applet/app-release.apk
    cp "$FOUND_APK" /app/applet/android/app-release.apk
    echo "APK_COPY_SUCCESS: /app/applet/app-release.apk"
else
    echo "APK_SEARCH_FAILED"
    find app/build/outputs/ -name "*.apk" 2>/dev/null || true
fi
