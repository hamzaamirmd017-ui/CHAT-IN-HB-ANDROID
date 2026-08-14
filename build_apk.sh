#!/usr/bin/env bash
set -e

echo "=== 1. Setting up JDK 17 ==="
if [ ! -f "/opt/jdk-17/bin/java" ]; then
    echo "Downloading JDK 17..."
    mkdir -p /opt/jdk-17
    curl -fsSL https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz | tar -xz -C /opt/jdk-17 --strip-components=1
fi

export JAVA_HOME=/opt/jdk-17
export PATH=$JAVA_HOME/bin:$PATH
java -version

echo "=== 2. Setting up Android SDK ==="
export ANDROID_HOME=/opt/android-sdk
mkdir -p /opt/android-sdk/cmdline-tools

if [ ! -f "/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager" ]; then
    echo "Downloading Android Command Line Tools..."
    curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/cmdline-tools.zip
    unzip -q -o /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools
    rm -rf /opt/android-sdk/cmdline-tools/latest
    mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest
    rm -f /tmp/cmdline-tools.zip
fi

export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

if [ ! -d "/opt/android-sdk/platforms/android-34" ] || [ ! -d "/opt/android-sdk/build-tools/34.0.0" ]; then
    echo "Accepting licenses and installing SDK packages..."
    yes | sdkmanager --sdk_root=/opt/android-sdk --licenses > /dev/null 2>&1 || true
    sdkmanager --sdk_root=/opt/android-sdk "platforms;android-34" "build-tools;34.0.0" "platform-tools"
fi

echo "=== 3. Setting up Gradle ==="
mkdir -p /opt/gradle
if [ ! -f "/opt/gradle/gradle-8.5/bin/gradle" ]; then
    echo "Downloading Gradle 8.5..."
    curl -fsSL https://services.gradle.org/distributions/gradle-8.5-bin.zip -o /tmp/gradle-8.5-bin.zip
    unzip -q -o /tmp/gradle-8.5-bin.zip -d /opt/gradle
    rm -f /tmp/gradle-8.5-bin.zip
fi
export PATH=/opt/gradle/gradle-8.5/bin:$PATH
gradle -v

echo "=== 4. Setting up local.properties and Keystore ==="
echo "sdk.dir=/opt/android-sdk" > android/local.properties
echo "sdk.dir=/opt/android-sdk" > local.properties

if [ ! -f "android/app/release.keystore" ]; then
    echo "Generating release keystore..."
    keytool -genkeypair -v -keystore android/app/release.keystore -alias chatinhb -keyalg RSA -keysize 2048 -validity 10000 -storepass chatinhbpass -keypass chatinhbpass -dname "CN=ChatInHB, OU=App, O=ChatInHB, L=City, ST=State, C=US"
fi

echo "=== 5. Building Release APK with Gradle ==="
cd android
chmod +x gradlew || true
gradle assembleRelease --stacktrace --no-daemon
cd ..

echo "=== 6. Verifying and Copying APK ==="
FOUND_APK=""
if [ -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    FOUND_APK="android/app/build/outputs/apk/release/app-release.apk"
elif [ -f "android/app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
    FOUND_APK="android/app/build/outputs/apk/release/app-release-unsigned.apk"
else
    FOUND_APK=$(find android/app/build/outputs/apk -name "*.apk" 2>/dev/null | head -n 1)
fi

if [ -n "$FOUND_APK" ] && [ -f "$FOUND_APK" ]; then
    echo "Found built APK: $FOUND_APK"
    cp -f "$FOUND_APK" app-release.apk
    cp -f "$FOUND_APK" android/app-release.apk
    echo "=== APK VERIFICATION ==="
    ls -lh app-release.apk
    ls -lh android/app-release.apk
    echo "STATUS: SUCCESS"
else
    echo "STATUS: FAILED"
    echo "Error: No APK file was generated in android/app/build/outputs/apk/"
    exit 1
fi
