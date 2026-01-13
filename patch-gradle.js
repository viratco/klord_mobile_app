#!/usr/bin/env node

/**
 * Patches expo-firebase-core Gradle build file for Gradle 8.14+ compatibility
 * Replaces deprecated 'classifier' property with 'archiveClassifier'
 */

const fs = require('fs');
const path = require('path');

const BUILD_GRADLE_PATH = path.join(
    __dirname,
    'node_modules',
    'expo-firebase-core',
    'android',
    'build.gradle'
);

console.log('🔧 Patching expo-firebase-core for Gradle 8.14+ compatibility...');

if (!fs.existsSync(BUILD_GRADLE_PATH)) {
    console.log('⚠️ expo-firebase-core/android/build.gradle not found. Skipping patch.');
    process.exit(0);
}

try {
    // Read the file
    let content = fs.readFileSync(BUILD_GRADLE_PATH, 'utf8');

    // Check if already patched
    if (content.includes('archiveClassifier')) {
        console.log('✅ File already patched!');
        process.exit(0);
    }

    // Apply the patch: replace 'classifier =' with 'archiveClassifier ='
    const patchedContent = content.replace(
        /(\s+)classifier(\s*=)/g,
        '$1archiveClassifier$2'
    );

    // Write back
    fs.writeFileSync(BUILD_GRADLE_PATH, patchedContent, 'utf8');

    console.log('✅ Patch applied successfully!');
    console.log('   Fixed: classifier → archiveClassifier');
    console.log('');
    console.log('🚀 Ready to build! Run: eas build --platform android --profile production');

} catch (error) {
    console.error('❌ Patch failed:', error.message);
    process.exit(1);
}
