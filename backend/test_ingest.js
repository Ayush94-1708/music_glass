const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('ffmpeg-static');
const path = require('path');
const fs = require('fs-extra');

if (ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
} else {
    ffmpeg.setFfmpegPath(ffmpegInstaller);
}

const testUrl = 'https://www.youtube.com/watch?v=K4DyBUG242c';
const testFilePath = path.join(__dirname, 'test_output.mp3');

async function test() {
    console.log('Testing URL:', testUrl);

    try {
        console.log('Fetching info...');
        const info = await ytdl.getInfo(testUrl);
        console.log('Video Title:', info.videoDetails.title);
        console.log('Formats available:', info.formats.length);

        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        console.log('Audio only formats:', audioFormats.length);

        // Try itag 140 (m4a audio) specifically if it exists
        const format140 = audioFormats.find(f => f.itag === 140);
        const selectedFormat = format140 || audioFormats[0];

        if (!selectedFormat) {
            console.error('No audio formats found');
            return;
        }

        console.log('Selected Format Itag:', selectedFormat.itag);
        console.log('Starting stream...');

        const stream = ytdl(testUrl, {
            quality: 'highestaudio',
            filter: 'audioonly',
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }
        });

        stream.on('error', (err) => {
            console.error('Stream Error:', err.message);
        });

        ffmpeg(stream)
            .audioBitrate(128)
            .toFormat('mp3')
            .on('error', (err) => {
                console.error('FFmpeg Error:', err.message);
            })
            .on('end', () => {
                console.log('Conversion finished successfully!');
            })
            .save(testFilePath);

    } catch (err) {
        console.error('Catch Error Message:', err.message);
        console.error('Catch Error Details:', err);
    }
}

test();
