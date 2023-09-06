const fs = require('fs');
const ytdl = require('ytdl-core');
const express = require('express');
const https = require("https")
const http = require('http')
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { title } = require('process');
const { Mutex } = require('async-mutex');
const puppeteer = require('puppeteer')
const mutex = new Mutex();
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const ytSearch = require('youtube-search-without-api-key');
var vidTitle = "";

const corsOptions = {
    origin: ['http://localhost:5500'],
    credentials: true,
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, '/')));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true, limit: '3mb' }))

var likedMusics = {}
async function puppeteerFunc(email, passwd, userid) {
    console.log(userid)
    const browser = await puppeteer.launch({ headless: false })
    const page = await browser.newPage()
    await page.goto('https://accounts.spotify.com/en/login')
    // const loginBtn = await page.waitForSelector(`button[data-testid="login-button"]`);
    // await loginBtn.click()
    // await loginBtn.dispose()

    const emailIdInput = await page.waitForSelector(`#login-username`)
    const passwdInput = await page.waitForSelector(`#login-password`)
    const secondLoginBtn = await page.waitForSelector('#login-button')
    await page.type('#login-username', email)
    await page.type('#login-password', passwd)
    await secondLoginBtn.click()
    // const body = await page.waitForSelector('body');
    // const innerHTMLHandle = await body.getProperty('innerHTML');
    // const innerHTML = await innerHTMLHandle.jsonValue();
    // console.log(innerHTML);


    try {
        const wrongMsg = await page.waitForSelector(`div[class="sc-lllmON iPNZrJ"]`, { timeout: 5000 })
        if (wrongMsg) {
            sendMessageToClient(userid, `Incorrect email or password.`)
            return true
        }
    }
    catch (err) {
        const webPlayerLink = await page.waitForSelector(`button[data-testid="web-player-link"]`)
        await webPlayerLink.click()
        const likedMusicSpan = await page.waitForSelector(`div[aria-labelledby="listrow-title-spotify:collection:tracks"]`)
        await likedMusicSpan.click()
        const footer = await page.waitForSelector(`div[class="main-view-container__mh-footer-container"]`)

        for (let i = 0; i < 100; i++) {
            const lastLibrary = await page.waitForXPath(`//div[@aria-label="Liked Songs"]/div[2]/div[2]/div[last()]`)
            await fetchLikedMusic(page)
            await lastLibrary.scrollIntoView()
            sendMessageToClient(userid, `Found ${Object.keys(likedMusics).length} music in your library. Please do not refresh...`)
            if (await footer.isIntersectingViewport()) break
            await page.waitForTimeout(1000)
        }

        await browser.close()
        return false
    }
}

async function fetchLikedMusic(page) {
    const likedMusicList = await page.waitForXPath(`//div[@aria-label="Liked Songs"]/div[2]/div[2]`)
    const divHandles = await likedMusicList.$$('div div div[aria-colindex="2"] div a div')
    const artistHandle = await likedMusicList.$$('div div div[aria-colindex="2"] div span a:nth-child(1)')

    for (let handle in divHandles) {
        const name = await (await divHandles[handle].getProperty('textContent')).jsonValue();
        const artist = await (await artistHandle[handle].getProperty('textContent')).jsonValue();
        likedMusics[name] = artist
    }
}

async function download(url) {
    let vidID = ytdl.getURLVideoID(url);
    let vidTime = 0;
    await ytdl.getInfo(url).then(info => {
        vidTime = info.videoDetails.lengthSeconds
        vidTitle = info.videoDetails.title;
    })

    if (fs.existsSync("music-" + vidID + ".mp3")) {
        return new Promise((resolve) => {
            resolve(vidID)
        })
    }
    else if (vidTime >= 3600) {
        return new Promise((resolve) => {
            resolve("1hour")
        })
    }
    else {
        stream = ytdl(url, {
            quality: 18
        });
        stream.pipe(fs.createWriteStream('music-' + vidID + '.mp4'));

        return new Promise((resolve) => {
            stream.on('end', () => {
                resolve(vidID);
            });
        });
    }
}

async function extractAudio(vidID) {

    if (fs.existsSync("music-" + vidID + ".mp3")) {
        return new Promise((resolve) => {
            resolve(vidID)
        })
    }

    const mp4File = 'music-' + vidID + '.mp4';
    const mp3File = 'music-' + vidID + '.mp3';
    return new Promise((resolve, reject) => {
        ffmpeg(fs.createReadStream(mp4File))
            .outputOptions('-vn')
            .outputOptions('-c:a libmp3lame')
            .output(mp3File)
            .on('end', () => {
                fs.unlinkSync("music-" + vidID + ".mp4")
                resolve(mp3File);
            })
            .on('error', (err) => {
                reject(err);
            })
            .run();
    });
}

app.get('/', (req, res) => {
    res.send("Guava Music Backend")
})

app.post('/spotifyLikedSongs', async (req, res) => {
    const release = await mutex.acquire();

    try {
        let musicFetch = await puppeteerFunc(req.body.emailid, req.body.passwd, req.body.wsuserid)
        if (musicFetch) {
            console.log('Error:', 'Invalid username and password');
            res.status(500).json(['Invalid username and password'])
        }
        else {
            let response = []
            let totalLikedMusics = Object.keys(likedMusics).length;
            let currentProgress = 0;
            console.log('importing')
            for (let i in likedMusics) {
                if (likedMusics.hasOwnProperty(i)) {
                    const value = likedMusics[i];
                    currentProgress++
                    sendMessageToClient(req.body.wsuserid, `Fetched ${currentProgress}/${totalLikedMusics} music. Please do not refresh...`)
                    const videos = await ytSearch.search(`${i} ${value} lyrics`)
                    response.push(videos[0])
                }
            }
            likedMusics = {}
            res.json(response)
        }
    } catch (err) {
        console.log('Error:', err);
        res.status(500).json(['Error searching for videos. Please try again later.'])
    }
    finally {
        release()
    }
})

app.post('/search', async (req, res) => {
    const release = await mutex.acquire();

    try {
        const searchQuery = req.body.query
        console.log(searchQuery)
        const videos = await ytSearch.search(searchQuery)
        if (videos.length != 0) {
            videos.length = 6
        }
        else {
            videos.push(['Error occured on our server. Please try again later.'])
        }
        res.json(videos)
    } catch (err) {
        console.log('Error:', err);
        res.status(500).json(['Error searching for videos. Please try again later.'])
    }
    finally {
        release();
    }
})

app.post('/process/:id', async (req, res) => {
    const release = await mutex.acquire();

    try {
        const ytlink = req.body.ytlink;
        const id = req.body.musicid;
        const vidID = await download(ytlink);

        if (vidID == "1hour") {
            res.status(500).json({
                status: 'long',
                message: 'An error occurred while processing the audio.',
                vidTitle: "The music requested was longer than 1 hour."
            });
        }
        else {
            const mp3File = await extractAudio(vidID);

            res.json({
                status: 'success',
                message: 'Data received successfully!',
                vidid: id,
                vidtitle: vidTitle
            });
        }
    } catch (err) {
        console.log('Error:', err);
        if (err.statusCode == 410) {
            res.status(500).json({
                status: '410',
                message: 'An error occurred while processing the audio.',
                vidTitle: "The audio requested was age restricted."
            })
        }
        else {
            res.status(500).json({
                status: 'error',
                message: 'An error occurred while processing the audio.',
                vidTitle: "Some error occured, please try again later."
            });
        }
    } finally {
        release()
    }
});

// const options = {
//     key: fs.readFileSync('privkey1.pem'),
//     cert: fs.readFileSync('cert1.pem')
// }

const PORT = process.env.PORT || 3000
const server = http.createServer(app).listen(PORT, console.log(`server running on port ${PORT}`))
const wss = new WebSocket.Server({ server });
const clients = new Map();
wss.on('connection', ws => {
    const userId = uuidv4()
    clients.set(userId, ws);
    ws.send(`userid ${userId}`);
    ws.on('message', (message) => {
        console.log('Received:', message);
    });
    ws.on('close', () => {
        clients.delete(userId);
    });
});

function sendMessageToClient(userId, message) {
    const ws = clients.get(userId);
    if (ws) {
        ws.send(message);
    }
}

// app.listen(PORT, () => console.log(`server running on port ${PORT}`))