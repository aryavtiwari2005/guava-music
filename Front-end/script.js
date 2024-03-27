var likeVidLink = ""
var likeVidData
const apiAdress = "https://guava-music.strangled.net"
var changingMusic = false
const redirectUri = 'https://guava-music.netlify.app/';
var importBtnLock = false
// const ws = new WebSocket("ws://64.227.162.57:443")
var wsUserId = ""

// ws.onmessage = event => {
//     console.log(event.data)
//     if (event.data.includes('userid')) {
//         wsUserId = event.data.split(" ")[1]
//         console.log(wsUserId)
//     }
//     else {
//         const progressTextElm = document.querySelector('div.progressText')
//         progressTextElm.textContent = event.data
//     }
// };

async function accessTokenRefresher(code) {
    localStorage.removeItem('access_token')
    let codeVerifier = localStorage.getItem('code_verifier');

    let body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier
    });

    const response = fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    })
        .then(response => {
            if (!response.ok) {
                throw new Error('HTTP status ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            localStorage.setItem('access_token', data.access_token);
            window.location.href = redirectUri
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

async function spotifyLogin() {
    //     const urlParams = new URLSearchParams(window.location.search);
    //     let code = urlParams.get('code');

    //     if (localStorage.getItem('access_token')) {
    //         const userDetails = await fetch('https://api.spotify.com/v1/me', {
    //             headers: {
    //                 Authorization: 'Bearer ' + localStorage.getItem('access_token')
    //             }
    //         })

    //         if (userDetails.ok) {
    //             const connectBtn = document.querySelector("#connect-spotify")
    //             connectBtn.style.display = "none"
    //             getProfile(localStorage.getItem('access_token'))
    //             return
    //         }

    //         await accessTokenRefresher(code)
    //         return
    //     }

    //     if (code) {
    //         accessTokenRefresher(code)
    //     }
    //     else {
    //         const codeVerifier = generateRandomString(128);
    // const connectBtn = document.querySelector('#connect-spotify')
    // const profileCard = document.querySelector('.profile-card')
    // const spotifyPfp = document.querySelector('#spotify-pfp')
    // connectBtn.style.display = "block"
    // profileCard.style.display = "none"
    // spotifyPfp.style.display = "none"
    // connectBtn.addEventListener('click', () => {
    //     generateCodeChallenge(codeVerifier).then(codeChallenge => {
    //         let state = generateRandomString(16);
    //         let scope = 'user-read-private user-read-email user-library-read';

    //         localStorage.setItem('code_verifier', codeVerifier);

    //         let args = new URLSearchParams({
    //             response_type: 'code',
    //             client_id: clientId,
    //             scope: scope,
    //             redirect_uri: redirectUri,
    //             state: state,
    //             code_challenge_method: 'S256',
    //             code_challenge: codeChallenge
    //         });

    //         window.location = 'https://accounts.spotify.com/authorize?' + args;
    //     });
    // })
    //     }
    // }

    if (!localStorage.getItem('spotifyCredentials')) {
        const connectBtn = document.querySelector('#connect-spotify')
        const profileCard = document.querySelector('.profile-card')
        const spotifyPfp = document.querySelector('#spotify-pfp')
        connectBtn.style.display = "block"
        profileCard.style.display = "none"
        spotifyPfp.style.display = "none"
        const spotifyCredentials = document.querySelector('.spotify-credentials')
        const loginSpotifyBtn = document.querySelector('.spotify-credentials button')
        const cross = document.querySelector('#cross')
        let loginInfoToggle = false

        loginSpotifyBtn.addEventListener('click', () => {
            if (importBtnLock) return
            importBtnLock = true
            const emailId = document.querySelector('.spotify-credentials #email-id')
            const progressTextElm = document.querySelector('div.progressText')
            const passwd = document.querySelector('.spotify-credentials #passwd')
            progressTextElm.textContent = "Authenticating..."
            if (emailId.value != "" && passwd.value != "") {
                fetch(`${apiAdress}/spotifyLikedSongs`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',

                    },
                    body: JSON.stringify({ emailid: emailId.value, passwd: passwd.value, wsuserid: wsUserId })
                })
                    .then(res => res.json())
                    .then(data => {
                        importBtnLock = false
                        if (data[0] == 'Invalid username and password') return
                        let reverseData = data.reverse()
                        var keysInOrder = JSON.parse(localStorage.getItem('likedKeys'))
                        var valuesInOrder = JSON.parse(localStorage.getItem('likedValues'))
                        var likedMusicObj = {}
                        for (let i in keysInOrder) {
                            likedMusicObj[keysInOrder[i]] = valuesInOrder[i];
                        }
                        for (let i = 0; i < data.length; i++) {
                            likedMusicObj[reverseData[i].id.videoId] = reverseData[i]
                        }
                        localStorage.setItem('likedKeys', JSON.stringify(Object.keys(likedMusicObj)))
                        localStorage.setItem('likedValues', JSON.stringify(Object.values(likedMusicObj)))
                        recentsReload()
                    })
                    .catch(err => console.log(err))
            }
        })

        cross.addEventListener('click', () => {
            if (loginInfoToggle) {
                loginInfoToggle = false
                spotifyCredentials.style.display = "none"
            }
        })

        connectBtn.addEventListener('click', () => {
            loginInfoToggle = !loginInfoToggle
            if (loginInfoToggle) {
                spotifyCredentials.style.display = "flex"
            }
            else {
                spotifyCredentials.style.display = "none"
            }
        })
    }
}

var profileCardOpen = false
async function getProfile(accessToken) {
    const connectBtn = document.querySelector('#connect-spotify')
    const spotifyPfp = document.querySelector('#spotify-pfp')
    const spotifyName = document.querySelector('.profile-name')
    const spotifyDetails = document.querySelector('.connectSpotify')
    const profileCard = document.querySelector('.profile-card')
    const logoutBtn = document.querySelector('#logout-spotify')
    const importMusic = document.querySelector('#import-music')
    connectBtn.style.display = "none"

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('access_token')
        window.location.href = redirectUri
    })

    const userDetails = await fetch('https://api.spotify.com/v1/me', {
        headers: {
            Authorization: 'Bearer ' + accessToken
        }
    })

    let userData;

    if (userDetails.ok) { userData = await userDetails.json(); }
    else return

    if (userData.images.length != 0) {
        spotifyPfp.setAttribute('src', userData.images[0].url)
    }

    spotifyName.innerHTML = userData.display_name
    spotifyDetails.addEventListener('click', () => {
        profileCardOpen = !profileCardOpen
        if (profileCardOpen) profileCard.style.display = "flex"
        else profileCard.style.display = "none"
    })

    if (localStorage.getItem('music-imported')) {
        importMusic.innerHTML = "Already Imported"
        importMusic.style.background = "none"
        importMusic.style.margin = "0"
        importMusic.style.color = "#6b6b6b"
    }

    importMusic.addEventListener('click', () => {
        if (localStorage.getItem('music-imported') == 'true') return

        importMusic.innerHTML = "Importing..."
        importMusic.style.background = "none"
        importMusic.style.margin = "0"
        importMusic.style.color = "#6b6b6b"

        localStorage.setItem('music-imported', 'true')

        importMusicFromSpotify(1000, 1000)
    })
}

async function importMusicFromSpotify(target, offset) {
    const searchingText = document.querySelector('.searchingText')
    searchingText.innerHTML = "Importing Music... This might take a while. Do not refresh the page"

    const likedMusic = await fetch(`https://api.spotify.com/v1/me/tracks?limit=50&offset=${offset}`, {
        headers: {
            Authorization: 'Bearer ' + localStorage.getItem("access_token")
        }
    });

    let likedMusicData;

    if (likedMusic.ok) { likedMusicData = await likedMusic.json(); }
    else return

    var likedMusics = new Object()

    for (let i = 0; i < likedMusicData.items.length; i++) {
        const name = likedMusicData.items[i].track.name.toString()
        likedMusics[name] = likedMusicData.items[i].track.artists[0].name
    }

    fetch(`${apiAdress}/spotifyLikedSongs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(likedMusics)
    }).then(res => res.json())
        .then(data => {
            let reverseData = data.reverse()
            var keysInOrder = JSON.parse(localStorage.getItem('likedKeys'))
            var valuesInOrder = JSON.parse(localStorage.getItem('likedValues'))
            var likedMusicObj = {}
            for (let i in keysInOrder) {
                likedMusicObj[keysInOrder[i]] = valuesInOrder[i];
            }
            for (let i = 0; i < data.length; i++) {
                likedMusicObj[reverseData[i].id.videoId] = reverseData[i]
            }
            localStorage.setItem('likedKeys', JSON.stringify(Object.keys(likedMusicObj)))
            localStorage.setItem('likedValues', JSON.stringify(Object.values(likedMusicObj)))
            if (offset - 50 < 0) {
                searchingText.innerHTML = ""
                recentsReload()
            }
            else importMusicFromSpotify(target, offset - 50)
        })
}

async function generateCodeChallenge(codeVerifier) {
    function base64encode(string) {
        return btoa(String.fromCharCode.apply(null, new Uint8Array(string)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);

    return base64encode(digest);
}

function truncate_text(string) {
    var x = string
    if (string.length > 40) {
        x = x.substring(0, 39) + "...";
    }
    return x
}

function generateRandomString(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

function setAudioMetaData(link, title, id, i) {
    const audioElement = document.querySelector("#audio-element")
    let skipTime = 10
    audioId = id
    audioTitle = title
    audioLink = link
    navigator.mediaSession.metadata = new MediaMetadata({
        title: title,
        artwork: [
            { src: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, sizes: '512x512', type: 'image/jpeg' }
        ]
    });

    navigator.mediaSession.setActionHandler("seekbackward", (evt) => {
        audioElement.currentTime = Math.max(audioElement.currentTime - skipTime, 0);
    });

    navigator.mediaSession.setActionHandler("seekforward", (evt) => {
        audioElement.currentTime = Math.min(audioElement.currentTime + skipTime, audioElement.duration);
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
        const seekTime = details.seekTime;
        if (seekTime >= 0 && seekTime <= audioElement.duration) {
            audioElement.currentTime = seekTime;
        }
    });


    navigator.mediaSession.setActionHandler('play', audioPlay);
    navigator.mediaSession.setActionHandler('pause', audioPause);
    navigator.mediaSession.setActionHandler('nexttrack', () => playMusic(i))
    navigator.mediaSession.setActionHandler('previoustrack', () => playMusic(i + 2))
}

function convertStoMs(seconds) {
    let minutes = Math.floor(seconds / 60);
    let extraSeconds = seconds % 60;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    extraSeconds = extraSeconds < 10 ? "0" + extraSeconds : extraSeconds;
    return [minutes, extraSeconds]
}

var isPlaying = false
var buttonPress = false

function seeker(evt) {
    if (!buttonPress) return
    let audioElement = document.querySelector("#audio-element")
    let rect = evt.target.getBoundingClientRect();
    var x = evt.clientX - rect.left;
    var percentCalc = (x / window.innerWidth)
    if (castingMedia) {
        let seekPoint = percentCalc * cjs.duration
        cjs.seek(seekPoint)
    }
    else {
        let seekPoint = percentCalc * audioElement.duration
        audioElement.currentTime = seekPoint
    }
}

function audioPlay() {
    let audioElement = document.querySelector("#audio-element")
    let audioPlayerPlay = document.querySelector("#audio-player #play-pause .play")
    let audioPlayerPause = document.querySelector("#audio-player #play-pause .pause")
    if (!castingMedia) audioElement.play()
    else cjs.play()
    isPlaying = true
    changingMusic = false
    audioPlayerPlay.style.display = "none"
    audioPlayerPause.style.display = "block"
}

function audioPause() {
    let audioElement = document.querySelector("#audio-element")
    let audioPlayerPlay = document.querySelector("#audio-player #play-pause .play")
    let audioPlayerPause = document.querySelector("#audio-player #play-pause .pause")
    if (!castingMedia) audioElement.pause()
    else cjs.pause()
    isPlaying = false
    audioPlayerPlay.style.display = "block"
    audioPlayerPause.style.display = "none"
}

var audioPlayerCalled = false
function audioPlayer() {
    let audioSeek = document.querySelector("#audio-player .seek-bar")
    let audioElement = document.querySelector("#audio-element")
    let likeMusic = document.querySelector(`.like-music .before-like`)
    let unlikeMusic = document.querySelector(`.like-music .after-like`)

    if (JSON.parse(localStorage.getItem('likedKeys')).includes(likeVidLink)) {
        unlikeMusic.style = "display:block;"
        likeMusic.style = "display:none;"
    }
    else {
        unlikeMusic.style = "display:none;"
        likeMusic.style = "display:block;"
    }

    likeMusic.addEventListener('click', () => {
        var keysInOrder = JSON.parse(localStorage.getItem('likedKeys'))
        var valuesInOrder = JSON.parse(localStorage.getItem('likedValues'))
        var likedMusicObj = {}
        for (let i in keysInOrder) {
            likedMusicObj[keysInOrder[i]] = valuesInOrder[i];
        }
        likedMusicObj[likeVidLink] = likeVidData
        localStorage.setItem('likedKeys', JSON.stringify(Object.keys(likedMusicObj)))
        localStorage.setItem('likedValues', JSON.stringify(Object.values(likedMusicObj)))
        setTimeout(recentsReload, 1000)
        likeMusic.style.display = "none"
        unlikeMusic.style.display = "block"
    })

    unlikeMusic.addEventListener('click', () => {
        var keysInOrder = JSON.parse(localStorage.getItem('likedKeys'))
        var valuesInOrder = JSON.parse(localStorage.getItem('likedValues'))
        var likedMusicObj = {}
        for (let i in keysInOrder) {
            likedMusicObj[keysInOrder[i]] = valuesInOrder[i];
        }
        delete likedMusicObj[likeVidLink]
        localStorage.setItem('likedKeys', JSON.stringify(Object.keys(likedMusicObj)))
        localStorage.setItem('likedValues', JSON.stringify(Object.values(likedMusicObj)))
        setTimeout(recentsReload, 1000)
        likeMusic.style.display = "block"
        unlikeMusic.style.display = "none"
    })

    document.addEventListener('mouseup', () => {
        if (buttonPress) audioPlay()
        buttonPress = false
    })

    document.addEventListener('touchend', (e) => {
        if (buttonPress) audioPlay()
        buttonPress = false
    })

    audioSeek.addEventListener('mousedown', (e) => {
        e.preventDefault()
        buttonPress = true
        audioPause()
        if (buttonPress) seeker(e)
        addEventListener('mousemove', (evt) => {
            if (castingMedia) return
            if (!buttonPress) removeEventListener('mousemove', seeker(evt))
            seeker(evt)
        })
    })

    audioSeek.addEventListener('touchstart', (e) => {
        if (castingMedia) return
        const touch = e.touches[0];
        buttonPress = true
        audioPause()
        if (buttonPress) seeker(touch)
        addEventListener('touchmove', (evt) => {
            if (castingMedia) return
            const ouch = evt.touches[0];
            if (!buttonPress) removeEventListener('touchmove', seeker(ouch))
            seeker(ouch)
        })
    })

    audioElement.addEventListener('timeupdate', () => {
        if (changingMusic) return

        const timeInfo = document.querySelector('#audio-player .information .time-info')
        if (castingMedia) return
        let curMin = convertStoMs(Math.floor(audioElement.currentTime))[0]
        let curSec = convertStoMs(Math.floor(audioElement.currentTime))[1]
        let totalMin = convertStoMs(Math.floor(audioElement.duration))[0]
        let totalSec = convertStoMs(Math.floor(audioElement.duration))[1]
        timeInfo.textContent = `${curMin}:${curSec}/${totalMin}:${totalSec}`
        const bar = (audioElement.currentTime / audioElement.duration)
        try { document.querySelector("#audio-player .progress-bar").animate({ "transform": `scaleX(${bar})` }, audioElement.duration) }
        catch (err) { }
        document.querySelector("#audio-player .progress-bar").style.transform = `scaleX(${bar})`
    })

    if (!audioPlayerCalled) {
        let playPauseBtn = document.querySelector("#audio-player #play-pause")
        playPauseBtn.addEventListener('click', () => {
            if (isPlaying) audioPause()
            else if (!isPlaying) audioPlay()
        })
    }
}

var currentPlayingNumber = 0
async function musicRequestFromApi(link, videData, i) {
    let musicDiv = document.getElementById('music')
    const thumbnail = document.querySelector('img#thumbnail')
    changingMusic = true
    const musicInfo = document.querySelector('#audio-player .information .music-name')
    musicInfo.innerHTML = "Loading the music from our servers........"
    likeVidLink = link
    likeVidData = videData
    castingMusicNumber = i
    fetch(`${apiAdress}/process/${link}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ytlink: 'https://www.youtube.com/watch?v=' + link, musicid: link })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status == 'error') {
                musicInfo.innerHTML = "Some error occured on our server."
                return
            }
            else if (data.status == 'long') {
                musicInfo.innerHTML = "The music requested is longer than 1 hour."
                return
            }
            else if (data.status == '410') {
                musicInfo.innerHTML = "The music is age restricted. Cannot play from server."
                return
            }

            thumbnail.setAttribute('src', `https://i.ytimg.com/vi/${likeVidLink}/hqdefault.jpg`)
            let audioElement = document.querySelector('#audio-element')
            audioElement.setAttribute('src', `${apiAdress}/music-${likeVidLink}.mp3`)
            if (playInShuffle == 2) audioElement.setAttribute('onended', `playMusic(${i}, true)`)
            else audioElement.setAttribute('onended', `playMusic(${i})`)
            audioElement.load()
            setAudioMetaData(`${apiAdress}/music-${likeVidLink}.mp3`, truncate_text(likeVidData.snippet.title), likeVidLink, castingMusicNumber)
            if (!castingMedia) musicInfo.innerHTML = truncate_text(likeVidData.snippet.title)
            else musicInfo.innerHTML = `Playing ${truncate_text(likeVidData.snippet.title)} on ${cjs.device}`
            if (!castingMedia) audioPlay()
            audioPlayer()
            audioPlayerCalled = true
            if (castingMedia) castMedia()
        })

    // const thumbnail = document.querySelector('img#thumbnail')
    // changingMusic = true
    // const musicInfo = document.querySelector('#audio-player .information .music-name')
    // musicInfo.innerHTML = "Loading the music from our servers........"
    // likeVidLink = link
    // likeVidData = videData
    // castingMusicNumber = i
    // thumbnail.setAttribute('src', `https://i.ytimg.com/vi/${link}/hqdefault.jpg`)
    // let audioElement = document.querySelector('#audio-element')
    // audioElement.setAttribute('src', `${apiAdress}/music-${link}.mp3`)
    // if (playInShuffle == 2) audioElement.setAttribute('onended', `playMusic(${i}, true)`)
    // else audioElement.setAttribute('onended', `playMusic(${i})`)
    // audioElement.load()
    // setAudioMetaData(`${apiAdress}/music-${link}.mp3`, videData.snippet.title, link, i)
    // if (!castingMedia) musicInfo.innerHTML = truncate_text(videData.snippet.title)
    // else musicInfo.innerHTML = `Playing ${truncate_text(videData.snippet.title)} on ${cjs.device}`
    // if (!castingMedia) audioPlay()
    // audioPlayer()
    // audioPlayerCalled = true
    // if (castingMedia) castMedia()
}

function playMusic(i, loop = false) {
    let x = i
    if (playInShuffle == 1 && !loop) x = Math.floor(Math.random() * JSON.parse(localStorage.getItem('likedKeys')).length)
    else if (playInShuffle == 2) loop = true

    if (x < 0) x = JSON.parse(localStorage.getItem('likedKeys')).length - 1
    else if (x >= JSON.parse(localStorage.getItem('likedKeys')).length - 1) x = JSON.parse(localStorage.getItem('likedKeys')).length - 1

    var link
    var videData
    try {
        var keysInOrder = JSON.parse(localStorage.getItem('likedKeys'))
        var valuesInOrder = JSON.parse(localStorage.getItem('likedValues'))
        link = keysInOrder[x]
        videData = valuesInOrder[x]
        if (loop && playInShuffle == 2) {
            link = likeVidLink
            videData = likeVidData
        }
        musicRequestFromApi(link, videData, x - 1)
    }
    catch (err) {
        playMusic(x - 1)
    }
}

function execute() {
    var ab = document.getElementById('search_input').value
    const searchingText = document.querySelector('.searchingText')
    searchingText.innerHTML = "Searching..."

    fetch(`${apiAdress}/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ query: ab })
    }).then(res => res.json()).then((data) => {
        console.log(data)
        searchingText.innerHTML = ""
        let div = document.getElementById("searches")
        let musicDiv = document.getElementById('music')
        while (div.hasChildNodes()) div.removeChild(div.firstChild)
        for (var i in data) {
            var y = data[i].snippet.title
            let link = data[i].id.videoId
            let videoData = data[i]
            let p = document.createElement("p")
            p.innerHTML = `${i}. ${y}`
            p.id = "song"
            p.addEventListener('click', () => {
                castingInQueue = false
                musicRequestFromApi(link, videoData, i)
            })
            div.append(p)
        }
    }).catch(err => console.log(err))
}

var audioLink = ""
var audioId = ""
var audioTitle = ""
var castingMedia = false
var cjs
var castingInQueue = true
async function castMedia() {
    if (audioLink == "") return
    let audioElement = document.querySelector("#audio-element")
    const castBtn = document.querySelector("#cast-media")
    if (castingMedia) {
        castBtn.innerHTML = "Stop casting"
        if (cjs.available) {
            await cjs.cast(audioLink, {
                poster: `https://i.ytimg.com/vi/${audioId}/hqdefault.jpg`,
                title: audioTitle,
                description: 'Casting from Guava Music'
            })
            audioElement.pause()
            const musicInfo = document.querySelector('#audio-player .information .music-name')
            musicInfo.innerHTML = `Playing ${truncate_text(audioTitle)} on ${cjs.device}`
        }
    }
    else {
        castBtn.innerHTML = "Cast Music"
        cjs.disconnect()
    }
}

var musicNumber = 0
var castingMusicNumber = 0
var playInShuffle = 0
function recentsReload() {
    if (!localStorage.getItem('likedKeys')) localStorage.setItem('likedKeys', JSON.stringify([]))
    if (!localStorage.getItem('likedValues')) localStorage.setItem('likedValues', JSON.stringify([]))

    let recents = document.getElementById("recents")
    let musicDiv = document.getElementById('music')
    while (recents.hasChildNodes()) {
        musicNumber = 0
        recents.removeChild(recents.firstChild)
    }

    for (let i = JSON.parse(localStorage.getItem('likedKeys')).length - 1; i >= 0; i--) {
        let videoData;
        let link;
        let y;
        try {
            var keysInOrder = JSON.parse(localStorage.getItem('likedKeys'))
            var valuesInOrder = JSON.parse(localStorage.getItem('likedValues'))
            videoData = valuesInOrder[i]
            y = videoData.snippet.title
            link = videoData.id.videoId
        } catch (err) {
            continue
        }
        musicNumber++;
        let p = document.createElement("p")
        p.innerHTML = `${musicNumber}. ${y}`
        p.id = `song`
        p.addEventListener('click', () => {
            if (castingMedia) {
                castingInQueue = false
                if (playInShuffle == 1) playMusic(i + 1, true)
                else playMusic(i)
            }
            else if (playInShuffle == 1) playMusic(i, true)
            else playMusic(i)
        })
        recents.append(p)
    }
}

document.addEventListener("DOMContentLoaded", () => {
    recentsReload()
    // spotifyLogin()

    const resetDataBtn = document.querySelector('#reset-data')
    let timesClicked = 0
    resetDataBtn.addEventListener('click', () => {
        timesClicked++
        if (timesClicked == 1) resetDataBtn.innerHTML = "This will remove all your liked music. Are you Sure?"
        else if (timesClicked == 2) {
            localStorage.clear()
            resetDataBtn.innerHTML = "Resetting to default..."
            window.location.href = `${redirectUri}`
        }
    })

    // cjs = new Castjs()
    // cjs.on('event', (e) => {
    //     if (e === 'end') {
    //         if (castingInQueue) playMusic(castingMusicNumber)
    //         castingInQueue = true
    //     }
    //     else if (e === 'available') {
    //         const castMedia = document.querySelector("#cast-media")
    //         castMedia.style.display = "block"
    //     }
    //     else if (e === 'playing') {
    //         let audioPlayerPlay = document.querySelector("#audio-player #play-pause .play")
    //         let audioPlayerPause = document.querySelector("#audio-player #play-pause .pause")
    //         audioPlayerPlay.style.display = "none"
    //         audioPlayerPause.style.display = "block"
    //     }
    //     else if (e === 'pause') {
    //         let audioPlayerPlay = document.querySelector("#audio-player #play-pause .play")
    //         let audioPlayerPause = document.querySelector("#audio-player #play-pause .pause")
    //         audioPlayerPlay.style.display = "block"
    //         audioPlayerPause.style.display = "none"
    //     }
    //     else if (e === 'timeupdate') {
    //         try {
    //             const timeInfo = document.querySelector('#audio-player .information .time-info')
    //             let curMin = convertStoMs(Math.floor(cjs.time))[0]
    //             let curSec = convertStoMs(Math.floor(cjs.time))[1]
    //             let totalMin = convertStoMs(Math.floor(cjs.duration))[0]
    //             let totalSec = convertStoMs(Math.floor(cjs.duration))[1]
    //             timeInfo.textContent = `${curMin}:${curSec}/${totalMin}:${totalSec}`
    //             document.querySelector("#audio-player .progress-bar").animate({ "transform": `scaleX(${cjs.progress / 100})` }, audioElement.duration)
    //             document.querySelector("#audio-player .progress-bar").style.transform = `scaleX(${cjs.progress / 100})`
    //         }
    //         catch (err) {
    //             console.log(err)
    //         }
    //     }
    //     else if (e === 'buffering') {
    //         cjs.seek(0)
    //     }
    // })

    // const castBtn = document.querySelector('#cast-media')
    // castBtn.addEventListener('click', () => {
    //     if (audioLink != "") castingMedia = !castingMedia
    //     castMedia()
    // })

    const shuffleBtn = document.querySelector("#shuffle-music")
    shuffleBtn.className = "list"
    shuffleBtn.addEventListener('click', () => {
        playInShuffle++
        if (playInShuffle > 2) playInShuffle = 0
        if (playInShuffle == 0) shuffleBtn.className = "list"
        else if (playInShuffle == 1) shuffleBtn.className = "shuffle"
        else shuffleBtn.className = "loop"
    })

    let audioElement = document.querySelector('#audio-element')

    audioElement.addEventListener('error', (e) => {
        const thumbnail = document.querySelector('img#thumbnail')
        const musicInfo = document.querySelector('#audio-player .information .music-name')
        musicInfo.innerHTML = "Loading the music from our servers........"
        fetch(`${apiAdress}/process/${likeVidLink}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ytlink: 'https://www.youtube.com/watch?v=' + likeVidLink, musicid: likeVidLink })
        })
            .then(res => res.json())
            .then(data => {
                if (data.status == 'error') {
                    musicInfo.innerHTML = "Some error occured on our server."
                    return
                }
                else if (data.status == 'long') {
                    musicInfo.innerHTML = "The music requested is longer than 1 hour."
                    return
                }
                else if (data.status == '410') {
                    musicInfo.innerHTML = "The music is age restricted. Cannot play from server."
                    return
                }

                thumbnail.setAttribute('src', `https://i.ytimg.com/vi/${likeVidLink}/hqdefault.jpg`)
                let audioElement = document.querySelector('#audio-element')
                audioElement.setAttribute('src', `${apiAdress}/music-${likeVidLink}.mp3`)
                audioElement.setAttribute('onended', `playMusic(${castingMusicNumber})`)
                audioElement.load()
                setAudioMetaData(`${apiAdress}/music-${likeVidLink}.mp3`, truncate_text(likeVidData.snippet.title), likeVidLink, castingMusicNumber)
                if (!castingMedia) musicInfo.innerHTML = truncate_text(likeVidData.snippet.title)
                else musicInfo.innerHTML = `Playing ${truncate_text(likeVidData.snippet.title)} on ${cjs.device}`
                if (!castingMedia) audioPlay()
                audioPlayer()
                audioPlayerCalled = true
                if (castingMedia) castMedia()
            })
    })
})