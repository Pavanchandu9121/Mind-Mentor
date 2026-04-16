const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const os = require('os');

// Temp directory for screening uploads
const TEMP_DIR = path.join(os.tmpdir(), 'mindmentor-screening');

/**
 * Ensure the temp directory exists.
 */
function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  return TEMP_DIR;
}

/**
 * Extract audio (.wav) from a video file using FFmpeg.
 * @param {string} videoPath — absolute path to .webm video
 * @returns {Promise<string>} — absolute path to extracted .wav
 */
function extractAudio(videoPath) {
  return new Promise((resolve, reject) => {
    const audioPath = videoPath.replace(/\.[^.]+$/, '.wav');

    const args = [
      '-i', videoPath,
      '-vn',                   // No video
      '-acodec', 'pcm_s16le', // PCM 16-bit WAV
      '-ar', '16000',         // 16kHz sample rate (optimal for Whisper)
      '-ac', '1',             // Mono channel
      '-y',                   // Overwrite output
      audioPath
    ];

    console.log(`[FileHandler] Extracting audio: ffmpeg ${args.join(' ')}`);

    execFile('ffmpeg', args, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[FileHandler] FFmpeg error:', error.message);
        console.error('[FileHandler] FFmpeg stderr:', stderr);
        return reject(new Error(`Audio extraction failed: ${error.message}`));
      }

      if (!fs.existsSync(audioPath)) {
        return reject(new Error('Audio extraction produced no output file'));
      }

      const stats = fs.statSync(audioPath);
      console.log(`[FileHandler] Audio extracted: ${audioPath} (${(stats.size / 1024).toFixed(1)} KB)`);
      resolve(audioPath);
    });
  });
}

/**
 * Clean up temporary files.
 * @param {...string} filePaths — paths to delete
 */
function cleanupFiles(...filePaths) {
  for (const filePath of filePaths) {
    try {
      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[FileHandler] Cleaned up: ${path.basename(filePath)}`);
      }
    } catch (err) {
      console.warn(`[FileHandler] Cleanup warning for ${filePath}: ${err.message}`);
    }
  }
}

/**
 * Check if FFmpeg is available on the system.
 * @returns {Promise<boolean>}
 */
function checkFFmpeg() {
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], { timeout: 5000 }, (error) => {
      resolve(!error);
    });
  });
}

module.exports = {
  TEMP_DIR,
  ensureTempDir,
  extractAudio,
  cleanupFiles,
  checkFFmpeg
};
