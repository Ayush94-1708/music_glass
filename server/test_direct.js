const axios = require('axios');
const path = require('path');
const fs = require('fs-extra');

const testUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
const testFilePath = path.join(__dirname, 'test_mp3.mp3');

async function test() {
    console.log('Testing Direct MP3 URL:', testUrl);

    try {
        console.log('Starting download...');
        const response = await axios({
            url: testUrl,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(testFilePath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            console.log('Download finished successfully!');
            console.log('File size:', fs.statSync(testFilePath).size);
        });

        writer.on('error', (err) => {
            console.error('Download Error:', err.message);
        });

    } catch (err) {
        console.error('Catch Error Message:', err.message);
    }
}

test();
