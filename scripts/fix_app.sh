#!/bin/bash
set -e

echo "=== 1. Terminating any background Electron instances ==="
killall -9 Electron 2>/dev/null || true
killall -9 Diary 2>/dev/null || true

echo "=== 2. Fixing Info.plist to resolve Chromium MachPort rendezvous ==="
# CFBundleIdentifier MUST match the helper apps (com.github.Electron)
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.github.Electron" /Applications/Diary.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Diary" /Applications/Diary.app/Contents/Info.plist
/usr/libexec/PlistBuddy -c "Set :CFBundleName Diary" /Applications/Diary.app/Contents/Info.plist

echo "=== 3. Updating icon to clean 3D terracotta journal ==="
cp /Users/likeashot/Desktop/dairy/assets/AppIcon.icns /Applications/Diary.app/Contents/Resources/electron.icns

echo "=== 4. Clearing quarantine and refreshing LaunchServices ==="
xattr -cr /Applications/Diary.app
touch /Applications/Diary.app

echo "=== 5. Launching /Applications/Diary.app ==="
open /Applications/Diary.app
echo "Diary launched successfully!"
