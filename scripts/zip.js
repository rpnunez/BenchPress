import fs from 'fs';
import archiver from 'archiver';
import path from 'path';

// Ensure public directory exists
const publicDir = path.resolve('./public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

const outputPath = path.resolve('./public/wp-performance-benchmarker.zip');
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level 
});

output.on('close', function() {
  console.log(`Successfully zipped plugin! Total bytes: ${archive.pointer()}`);
  console.log(`Available at: /wp-performance-benchmarker.zip`);
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// append files from the plugin directory, putting its contents at the root of archive
archive.directory('wp-performance-benchmarker/', 'wp-performance-benchmarker');

archive.finalize();
