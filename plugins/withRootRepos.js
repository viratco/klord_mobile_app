const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withRootRepos(config) {
    return withProjectBuildGradle(config, (config) => {
        if (config.modResults.language === 'groovy') {
            const buildGradle = config.modResults.contents;
            // Look for the buildscript repositories block
            const pattern = /buildscript\s*\{[\s\S]*?repositories\s*\{/;

            // If it exists and we haven't added the repo yet
            if (pattern.test(buildGradle) && !buildGradle.includes('releases.jfrog.io')) {
                const replacement = `buildscript {
    repositories {
        maven { url 'https://releases.jfrog.io/artifactory/oss-releases' }`;

                config.modResults.contents = buildGradle.replace(pattern, replacement);
            }
        }
        return config;
    });
};
