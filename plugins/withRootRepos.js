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

            // Add exclusion for the problematic JFrog buildinfo dependency
            if (!buildGradle.includes('exclude group: \'org.jfrog.buildinfo\'')) {
                const exclusionCode = `
configurations.classpath {
    exclude group: 'org.jfrog.buildinfo', module: 'build-info-extractor-gradle'
}
`;
                // Find the end of buildscript block dependencies and add exclusion after
                const depsEndPattern = /(buildscript\s*\{[\s\S]*?dependencies\s*\{[\s\S]*?\}\s*\n)/;
                if (depsEndPattern.test(buildGradle)) {
                    buildGradle = buildGradle.replace(depsEndPattern, (match) => {
                        return match + exclusionCode;
                    });
                }
            }

            config.modResults.contents = buildGradle;
        }
        return config;
    });
};
