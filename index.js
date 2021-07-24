require('dotenv').config()

const express = require("express")
    , multer = require("multer")
    , DiscordRPC = require("discord-rpc")
    , rpc = new DiscordRPC.Client({ transport: 'ipc' })
    , app = express()
    , PORT = 6868
    , discordClientId = process.env.DISCORD_CLIENTID

var currentState = null
    , sendInterval = null
    , startTimestamp = null
    , intervalInUse = false
    , mult = multer();

async function setActivity() {
    app.use(express.json())
    app.listen(PORT, () => console.log(`Server running: Port ${PORT}`))
    
    function sendMediaStatus(){
        rpc.setActivity(currentState)
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
            rpc.clearActivity()
            intervalInUse = false
        }
        else{
            switch(payload.Metadata.librarySectionType){
                case "show":
                    currentState = {
                        details: payload.Metadata.grandparentTitle,
                        state: payload.Metadata.parentTitle + " Episode "
                            + payload.Metadata.index,
                        instance: true,
                        startTimestamp,
                        largeImageKey: "plex-icon",
                        smallImageKey: ((payload.event === "media.pause") 
                                        ? "pause-icon" : "play-icon")
                    }
                    clearInterval(sendInterval)
                    sendInterval = setInterval(sendMediaStatus, 15e3)
                    intervalInUse = true
                    break;
                case "movie":
                    currentState = {
                        details: payload.Metadata.title + ` (${payload.Metadata.year})`,
                        state: (payload.Metadata.tagline ? payload.Metadata.tagline
                                : payload.Metadata.originallyAvailableAt),
                        instance: true,
                        startTimestamp,
                        largeImageKey: "plex-icon",
                        smallImageKey: ((payload.event === "media.pause") 
                                        ? "pause-icon" : "play-icon")
                    }
                    clearInterval(sendInterval)
                    sendInterval = setInterval(sendMediaStatus, 15e3)
                    intervalInUse = true
                    break;
                case "artist": // Music
                    currentState = {
                        details: `${payload.Metadata.title} - ${payload.Metadata.grandparentTitle}`,
                        state: `${payload.Metadata.parentTitle} (${payload.Metadata.parentYear})`,
                        instance: true,
                        startTimestamp,
                        largeImageKey: process.env.IMAGE_LOGO,
                        smallImageKey: ((payload.event === "media.pause") 
                                        ? process.env.IMAGE_PAUSE : process.env.IMAGE_PLAY)
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
        if(payload.event !== "media.stop")
            sendMediaStatus()
        // console.log(payload)
        console.table(currentState)
        console.log(`${new Date()}: Event type ${payload.event}`)
    })
}

rpc.on('ready', () => {
    console.log("Discord ready")
    setActivity()
})

rpc.login({ clientId: discordClientId }).catch(console.error)