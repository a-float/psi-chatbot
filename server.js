require('dotenv').config()
const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
app.use(express.static('public'))
app.use(express.json())

app.get('/', (req, res) => {
    res.sendFile("index.html")
})

app.post('/webhook', (req, res) => {
    // get agent from request
    console.log("boom");
    let agent = new WebhookClient({ request: req, response: res })    // create intentMap for handle intent
    let intentMap = new Map();    // add intent map 2nd parameter pass function
    intentMap.set('Pogoda', handleWeatherRequest)    // now agent is handle request and pass intent map
    agent.handleRequest(intentMap)
})

function handleWeatherRequest(agent) {
    console.log(agent.action)
    url = "http://api.openweathermap.org/data/2.5/weather?q=Krakow&units=metric&lang=pl&appid=c92e28a0be64d2e48ae6396907988666"
    agent.add("This is the weather")
}

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log("Server is running on port " + port)
})