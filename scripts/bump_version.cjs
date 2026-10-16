#!/usr/bin/env node
/**
 * Automated Multi-Platform Version Bumping Script
 * Synchronizes version across:
 *  - package.json
 *  - android/app/build.gradle (versionCode & versionName)
 *  - ios/App/App/Info.plist (CFBundleShortVersionString & CFBundleVersion)
 *
 * Usage:
 *   node scripts/bump_version.cjs patch    # 1.0.0 -> 1.0.1
 *   node scripts/bump_version.cjs minor    # 1.0.0 -> 1.1.0
 *   node scripts/bump_version.cjs major    # 1.0.0 -> 2.0.0
 *   node scripts/bump_version.cjs 1.2.3    # Explicit version
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const ANDROID_GRADLE_PATH = path.join(ROOT_DIR, 'android', 'app', 'build.gradle');
const IOS_PLIST_PATH = path.join(ROOT_DIR, 'ios', 'App', 'App', 'Info.plist');

const bumpType = process.argv[2] || 'patch';

// 1. Read package.json
const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
const currentVersion = pkg.version || '1.0.0';
const [major, minor, patch] = currentVersion.split('.').map(Number);

let newVersion;
if (bumpType === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (bumpType === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (bumpType === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
} else if (/^\d+\.\d+\.\d+$/.test(bumpType)) {
  newVersion = bumpType;
} else {
  console.error(`Invalid bump type "${bumpType}". Use "patch", "minor", "major", or a semver string like "1.0.1".`);
  process.exit(1);
}

console.log(`\n======================================================`);
console.log(`🚀 Bumping Plantar Pressure System: ${currentVersion} -> ${newVersion}`);
console.log(`======================================================\n`);

// 2. Update package.json
pkg.version = newVersion;
fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`✓ Updated package.json -> version ${newVersion}`);

// 3. Update android/app/build.gradle
if (fs.existsSync(ANDROID_GRADLE_PATH)) {
  let gradleContent = fs.readFileSync(ANDROID_GRADLE_PATH, 'utf8');
  let currentCode = 1;
  const codeMatch = gradleContent.match(/versionCode\s+(\d+)/);
  if (codeMatch) {
    currentCode = parseInt(codeMatch[1], 10);
  }
  const newCode = currentCode + 1;

  gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${newCode}`);
  gradleContent = gradleContent.replace(/versionName\s+["'][^"']+["']/, `versionName "${newVersion}"`);
  fs.writeFileSync(ANDROID_GRADLE_PATH, gradleContent, 'utf8');
  console.log(`✓ Updated android/app/build.gradle -> versionCode ${newCode}, versionName "${newVersion}"`);
}

// 4. Update ios/App/App/Info.plist
if (fs.existsSync(IOS_PLIST_PATH)) {
  let plistContent = fs.readFileSync(IOS_PLIST_PATH, 'utf8');
  // Update CFBundleShortVersionString
  plistContent = plistContent.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${newVersion}$2`
  );
  // Update CFBundleVersion
  const currentBuildMatch = plistContent.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
  const newBuild = currentBuildMatch ? parseInt(currentBuildMatch[1], 10) + 1 : 2;
  plistContent = plistContent.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
    `$1${newBuild}$2`
  );
  fs.writeFileSync(IOS_PLIST_PATH, plistContent, 'utf8');
  console.log(`✓ Updated ios/App/App/Info.plist -> CFBundleShortVersionString "${newVersion}", CFBundleVersion "${newBuild}"`);
}

console.log(`\n🎉 All platforms updated to version ${newVersion}!`);
console.log(`\nTo trigger the automated multi-platform release on GitHub Actions, run:`);
console.log(`  git commit -am "chore(release): bump version to ${newVersion}"`);
console.log(`  git tag v${newVersion}`);
console.log(`  git push origin main --tags\n`);
