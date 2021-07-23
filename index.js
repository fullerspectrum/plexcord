require('dotenv').config()

const express = require("express")
    , multer = require('multer')
    , app = express()
    , PORT = 6868
    , WebSocket = require("ws")
    , ws = new WebSocket(process.env.WS_URI)

var currentState = null
    , sendInterval = null
    , startTimestamp = null
    , intervalInUse = false
    , mult = multer();

app.use(express.json())
app.listen(PORT, () => console.log(`Server running: Port ${PORT}`))

ws.on('message', (msg) => {
    console.log(msg)
})

function sendMediaStatus(){
    ws.send(JSON.stringify(currentState))
    console.log("Sent status")
}

app.post('/',  mult.single('thumb'), (req, res, next) => {
    var payload = JSON.parse(req.body.payload)
    var mediaInfo = {};
    // console.log(payload)
    if((payload.event === "media.play"
            || payload.event === "media.resume") 
            && !intervalInUse){
        startTimestamp = new Date().getTime()
    }
    if(payload.event === "media.stop" && intervalInUse){
        clearInterval(sendInterval)
        intervalInUse = false
    }
    else{
        switch(payload.Metadata.librarySectionType){
            case "show":
                currentState = {
                    clientId: process.env.DISCORD_CLIENTID,
                    presence: {
                        details: payload.Metadata.grandparentTitle,
                        state: payload.Metadata.parentTitle + " Episode "
                            + payload.Metadata.index,
                        instance: true,
                        startTimestamp,
                        largeImageKey: "plex-icon",
                        smallImageKey: ((payload.event === "media.pause") 
                                        ? "pause-icon" : "play-icon")
                    },
                    extId: "00000000000000000000000000000000"
                }
                clearInterval(sendInterval)
                sendInterval = setInterval(sendMediaStatus, 15e3)
                intervalInUse = true
                break;
            case "movie":
                currentState = {
                    clientId: process.env.DISCORD_CLIENTID,
                    presence: {
                        details: payload.Metadata.title + ` (${payload.Metadata.year})`,
                        state: (payload.Metadata.tagline ? payload.Metadata.tagline
                                : payload.Metadata.originallyAvailableAt),
                        instance: true,
                        startTimestamp,
                        largeImageKey: "plex-icon",
                        smallImageKey: ((payload.event === "media.pause") 
                                        ? "pause-icon" : "play-icon")
                    },
                    extId: "00000000000000000000000000000000"
                }
                clearInterval(sendInterval)
                sendInterval = setInterval(sendMediaStatus, 15e3)
                intervalInUse = true
                break;
            case "artist": // Music
                currentState = {
                    clientId: process.env.DISCORD_CLIENTID,
                    presence: {
                        details: `${payload.Metadata.title} - ${payload.Metadata.grandparentTitle}`,
                        state: `${payload.Metadata.parentTitle} (${payload.Metadata.parentYear})`,
                        instance: true,
                        startTimestamp,
                        largeImageKey: "plex-icon",
                        smallImageKey: ((payload.event === "media.pause") 
                                        ? "pause-icon" : "play-icon")
                    },
                    extId: "00000000000000000000000000000000"
                }
                clearInterval(sendInterval)
                sendInterval = setInterval(sendMediaStatus, 15e3)
                intervalInUse = true
                break;
            default:
                console.log(`Unrecognized library type: ${payload.Metadata.librarySectionType}`)
                break;
        }
    }
    // sendMediaStatus()
    // console.log(payload)
    console.table(currentState)
    console.log(`${new Date()}: Event type ${payload.event}`)
})