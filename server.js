require('dotenv').config()
const fetch = require('node-fetch')
const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const { Image, Text } = require('dialogflow-fulfillment')
const app = express()
app.use(express.static('public'))
app.use(express.json())

app.get('/', (req, res) => {
    res.sendFile("index.html")
})

app.post('/webhook', (req, res) => {
    // get agent from request
    let agent = new WebhookClient({ request: req, response: res })    // create intentMap for handle intent
    let intentMap = new Map();    // add intent map 2nd parameter pass function
    intentMap.set('Pogoda', handleWeatherRequest)
    intentMap.set('Kaczka', handleDuckRequest)
    agent.handleRequest(intentMap)
})

function removePolish(string) {
    const from = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ż", "ź", "Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ż", "Ź"]
    const to = ["a", "c", "e", "l", "n", "o", "s", "z", "z", "A", "C", "E", "L", "N", "O", "S", "Z", "Z"]
    for (let i = 0; i < from.length; i++) {
        string = string.replace(from[i], to[i])
    }
    return string
}

function handleDuckRequest(agent) {
    const url = "https://random-d.uk/api/v2/quack"
    fetch(url).then(data => data.json).then(json => {
        const image = Image(json.url)
        agent.add(image)
    }).catch(e => {
        console.log(e);
        agent.add("Przepraszam, nie udało mi się złapać żadnej kaczki :<")
    })
}

function handleWeatherRequest(agent) {
    if (agent.parameters.date) {
        let date = Date.parse(agent.parameters.date)
        const now = new Date()
        console.log(date);
        // console.log(date.toUTCString() + " " + now.toUTCString());
        if (now.getFullYear() != date.getFullYear || now.getMonth() != date.getMonth() || now.getDay() != date.getDay()) {
            agent.add(Text("Niestety mogę sprawdzić tylko dzisiejszą pogodę."));
        }
    }
    let city = agent.parameters.city
    city = removePolish(city)
    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=pl&appid=${process.env.WEATHER_KEY}`
    fetch(url).then(response => response.json()).then(json => {
        if (json.cod != 200) {
            resp = "Niestety nie znam takiego miasta :c"
        }
        else {
            resp = `W mieście ${city} jest dzisiaj ${json.weather[0].description}. Najniższa temperatura wyniesie ${json.main.temp_min}°C, a najwyższa ${json.main.temp_max}°C, ale temperatura odczuwalna wyniesie ${json.main.feels_like}°C.`
        }
        agent.add(resp);
    }).catch(e => {
        console.log(e)
        agent.add("Ups, nie udało mi się sprawdzić pogody :(");
    })
}

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log("Server is running on port " + port)
})