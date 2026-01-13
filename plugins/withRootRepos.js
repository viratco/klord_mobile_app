const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withRootRepos(config) {
    return withProjectBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            let buildGradle = config.modResults.contents;

            // Add JFrog releases repository if not present
            const pattern = /buildscript\s*\{[\s\S]*?repositories\s*\{/;
            if (pattern.test(buildGradle) && !buildGradle.includes('releases.jfrog.io')) {
                buildGradle = buildGradle.replace(pattern, `buildscript {
    repositories {
        maven { url 'https://releases.jfrog.io/artifactory/oss-releases' }`);
            }

            // Add subprojects block to fix Firebase compileSdk issues
            if (!buildGradle.includes('subprojects {')) {
                const applyPluginPattern = /(apply plugin: "expo-root-project")/;
                const subprojectsBlock = `subprojects {
    afterEvaluate { project ->
        if (project.hasProperty("android")) {
            android {
                if (namespace == null) {
                    namespace project.group
                }
                compileSdkVersion 36
            }
        }
    }
}

$1`;
                buildGradle = buildGradle.replace(applyPluginPattern, subprojectsBlock);
            }

            config.modResults.contents = buildGradle;
        }
        return config;
    });
};
