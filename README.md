# CHAT IN HB - Android Application

This repository contains the full source code and automated GitHub Actions workflow for building the **CHAT IN HB** Android APK.

---

## 🚀 How to Build Android APK Locally

### On Windows
```cmd
# Build Debug APK
gradlew.bat assembleDebug

# Build Release APK
gradlew.bat assembleRelease
```

### On Linux / macOS
```bash
# Make wrapper executable
chmod +x gradlew android/gradlew

# Build Debug APK
./gradlew assembleDebug

# Build Release APK
./gradlew assembleRelease
```

---

## ⚙️ Automated GitHub Actions Build

This repository includes a pre-configured GitHub Actions workflow in `.github/workflows/android-apk.yml`.

### How to trigger build on GitHub:
1. Push your changes to the `main` or `master` branch (or open a Pull Request).
2. Go to your GitHub repository **Actions** tab.
3. Select **Android APK Build** workflow.
4. Click **Run workflow**.
5. Once the build finishes, download **`app-debug`** or **`app-release`** from the **Artifacts** section at the bottom of the summary page.

---

## 🔑 (Optional) Custom Release Keystore via GitHub Secrets

If you want to sign the Release APK with your own custom keystore:
- Add `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`, and `RELEASE_KEYSTORE_PATH` as **GitHub Repository Secrets**.
- If no custom secrets are set, the build automatically signs with the default release/debug key configuration cleanly.
