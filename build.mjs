// esbuild configuration for Argonaut
// Bundles all modules into a single file with content hash for cache busting

import * as esbuild from 'esbuild';
import fs from 'fs';

const isWatch = process.argv.includes('--watch');

// Configuration for the bundle
const buildOptions = {
    entryPoints: ['lib/main.js'],
    bundle: true,
    outdir: 'dist',
    format: 'esm',
    splitting: false,
    minify: true,
    // Content hash in filename for cache busting
    entryNames: 'main.[hash]',
    // Target older browsers for compatibility
    target: ['es2020'],
    // Banner to add at top of file
    banner: {
        js: '// Built with esbuild\n',
    },
    // Define environment
    define: {
        'process.env.NODE_ENV': '"production"',
    },
};

// Read current index.html and update it with the new bundle path
function updateIndexHtml(bundleFileName) {
    const htmlPath = 'index.html';
    let html = fs.readFileSync(htmlPath, 'utf8');

    // Replace the script src
    html = html.replace(
        /<script type="module" src="lib\/main\.js(\?[^"]*)"><\/script>/,
        `<script type="module" src="dist/${bundleFileName}"></script>`
    );

    // Replace CSS version with hash (use same hash as JS)
    const cssHash = bundleFileName.match(/main\.(.+)\.js/)[1];
    html = html.replace(
        /href="styles\.css(\?[^"]*)"/,
        `href="styles.css?${cssHash}"`
    );

    fs.writeFileSync(htmlPath, html);
    console.log(`Updated index.html with bundle: ${bundleFileName}`);
}

// Build function
async function build() {
    console.log('Building with esbuild...');

    try {
        const result = await esbuild.build(buildOptions);
        console.log('Build complete!');

        // Get the output file name
        const outputDir = 'dist';
        const files = fs.readdirSync(outputDir);
        const mainFile = files.find(f => f.startsWith('main.') && f.endsWith('.js') && !f.endsWith('.js.map'));

        if (mainFile) {
            console.log(`Output: ${outputDir}/${mainFile}`);
            updateIndexHtml(mainFile);
        } else {
            console.error('Could not find output JS file');
            process.exit(1);
        }
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

// Watch mode
if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
} else {
    build();
}
