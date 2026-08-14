#!/usr/bin/env bash
set -e

WORKSPACE_DIR="$(pwd)"
TOOLS_DIR="$WORKSPACE_DIR/tools"
mkdir -p "$TOOLS_DIR"

echo "=== STEP 1: Setting up JDK 17 in $TOOLS_DIR/jdk-17 ==="
if [ ! -f "$TOOLS_DIR/jdk-17/bin/java" ]; then
    echo "Downloading and extracting OpenJDK 17..."
    mkdir -p "$TOOLS_DIR/jdk-17"
    curl -fsSL "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.10%2B7/OpenJDK17U-jdk_x64_linux_hotspot_17.0.10_7.tar.gz" | tar -xz -C "$TOOLS_DIR/jdk-17" --strip-components=1
fi

export JAVA_HOME="$TOOLS_DIR/jdk-17"
export PATH="$JAVA_HOME/bin:$PATH"
echo "Java Version:"
"$JAVA_HOME/bin/java" -version

echo "=== STEP 2: Setting up Android SDK in $TOOLS_DIR/android-sdk ==="
export ANDROID_HOME="$TOOLS_DIR/android-sdk"
mkdir -p "$ANDROID_HOME/cmdline-tools"

if [ ! -f "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" ]; then
    echo "Downloading Android Command Line Tools..."
    curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -o "$TOOLS_DIR/cmdline-tools.zip"
    unzip -q -o "$TOOLS_DIR/cmdline-tools.zip" -d "$ANDROID_HOME/cmdline-tools"
    rm -rf "$ANDROID_HOME/cmdline-tools/latest"
    mv "$ANDROID_HOME/cmdline-tools/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
    rm -f "$TOOLS_DIR/cmdline-tools.zip"
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

if [ ! -d "$ANDROID_HOME/platforms/android-34" ] || [ ! -d "$ANDROID_HOME/build-tools/34.0.0" ]; then
    echo "Accepting licenses..."
    yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" --licenses > /dev/null 2>&1 || true
    echo "Installing platforms;android-34 and build-tools;34.0.0..."
    "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" "platforms;android-34" "build-tools;34.0.0" "platform-tools"
fi

echo "=== STEP 3: Setting up Gradle in $TOOLS_DIR/gradle-8.5 ==="
if [ ! -f "$TOOLS_DIR/gradle-8.5/bin/gradle" ]; then
    echo "Downloading Gradle 8.5..."
    curl -fsSL "https://services.gradle.org/distributions/gradle-8.5-bin.zip" -o "$TOOLS_DIR/gradle-8.5-bin.zip"
    unzip -q -o "$TOOLS_DIR/gradle-8.5-bin.zip" -d "$TOOLS_DIR"
    rm -f "$TOOLS_DIR/gradle-8.5-bin.zip"
fi
export PATH="$TOOLS_DIR/gradle-8.5/bin:$PATH"
echo "Gradle Version:"
"$TOOLS_DIR/gradle-8.5/bin/gradle" -v

echo "=== STEP 4: Setting up local.properties and Release Keystore ==="
echo "sdk.dir=$ANDROID_HOME" > "$WORKSPACE_DIR/android/local.properties"
echo "sdk.dir=$ANDROID_HOME" > "$WORKSPACE_DIR/local.properties"

if [ ! -f "$WORKSPACE_DIR/android/app/release.keystore" ]; then
    echo "Generating release.keystore..."
    "$JAVA_HOME/bin/keytool" -genkeypair -v -keystore "$WORKSPACE_DIR/android/app/release.keystore" -alias chatinhb -keyalg RSA -keysize 2048 -validity 10000 -storepass chatinhbpass -keypass chatinhbpass -dname "CN=ChatInHB, OU=App, O=ChatInHB, L=City, ST=State, C=US"
fi

echo "=== STEP 5: Executing assembleRelease in android/ ==="
cd "$WORKSPACE_DIR/android"
"$TOOLS_DIR/gradle-8.5/bin/gradle" clean assembleRelease --stacktrace --no-daemon

echo "=== STEP 6: Locating and copying generated APK ==="
cd "$WORKSPACE_DIR"
APK_PATH=""
if [ -f "$WORKSPACE_DIR/android/app/build/outputs/apk/release/app-release.apk" ]; then
    APK_PATH="$WORKSPACE_DIR/android/app/build/outputs/apk/release/app-release.apk"
else
    APK_PATH=$(find "$WORKSPACE_DIR/android/app/build/outputs/apk" -name "*.apk" 2>/dev/null | head -n 1)
fi

if [ -n "$APK_PATH" ] && [ -f "$APK_PATH" ]; then
    echo "Successfully generated APK: $APK_PATH"
    cp -f "$APK_PATH" "$WORKSPACE_DIR/app-release.apk"
    cp -f "$APK_PATH" "$WORKSPACE_DIR/android/app-release.apk"
    
    echo "=== VERIFICATION DETAILS ==="
    echo "Root APK:"
    ls -lh "$WORKSPACE_DIR/app-release.apk"
    echo "Android APK:"
    ls -lh "$WORKSPACE_DIR/android/app-release.apk"
    
    echo "Testing APK integrity with unzip..."
    unzip -t "$WORKSPACE_DIR/app-release.apk" | tail -n 5
    
    echo "=== APK_BUILD_SUCCESSFUL ==="
else
    echo "=== APK_BUILD_FAILED: Output file not found ==="
    exit 1
fi
