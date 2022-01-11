require('dotenv').config()
const fetch = require('node-fetch')
const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const { Image, Text } = require('dialogflow-fulfillment')
const trips = require("./trips")
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
    intentMap.set('Oferty', handleOffersRequest)
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

function prettyDate(date) {
    return `${(date.getDate() + 1).toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`
}

function getAllOffers() {
    return trips.find({}).exec().then(result => {
        console.log("Searching the database");
        if (result.length > 0) {
            const options = result.map(r => `"${r.name} z wyjazdem dnia ${prettyDate(r)}`).join("\n")
            return Promise.resolve("W najbliższym czasie oferujemy następujące wycieczi:\n" + options + "Czy któraś z nich Cię interesuje?")
        } else {
            return Promise.resolve("Niestety nie mamy obecnie dostępnych żadnych ofert.")
        }
    }).catch(err => {
        console.log(err)
        return Promise.resolve("Ups, zapomniałem jakie są oferty. Może zaraz sobie je przypomnę...")
    })
}

function handleOffersRequest(agent) {
    console.log("Offers request " + JSON.stringify(agent.parameters));
    return getAllOffers().then(answer => {
        agent.add(answer)
    }).catch(err => {
        console.log(err)
    })
};

function handleDuckRequest(agent) {
    console.log("Duck request " + JSON.stringify(agent.parameters));
    const url = "https://random-d.uk/api/v2/quack"
    return fetch(url).then(response => response.json()).then(json => {
        console.log(JSON.stringify(json))
        const image = new Image(json.url)
        agent.add(image)
        agent.add(`Oto Twoja kaczka! 🦆\n${json.url}`)
    }).catch(e => {
        console.log(e);
        agent.add("Przepraszam, nie udało mi się złapać żadnej kaczki :<")
    })
}

function handleWeatherRequest(agent) {
    console.log("Weather request " + JSON.stringify(agent.parameters));
    console.log(agent.parameters.date);
    if (agent.parameters.date) {
        let date = new Date(agent.parameters.date)
        const now = new Date()
        console.log(date);
        // console.log(date.toUTCString() + " " + now.toUTCString());
        if (now.getFullYear() != date.getFullYear() || now.getMonth() != date.getMonth() || now.getDate() != date.getDate()) {
            agent.add(new Text("Niestety mogę sprawdzić tylko dzisiejszą pogodę."));
        }
    }
    let city = agent.parameters.city
    city = removePolish(city)
    let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&lang=pl&appid=${process.env.WEATHER_KEY}`
    return fetch(url).then(response => response.json()).then(json => {
        if (json.cod != 200) {
            resp = "Niestety nie znam takiego miasta :c"
        }
        else {
            let emoji = "🥵"
            if (json.main.feels_like < 30) {
                emoji = "🤗";
            }
            if (json.main.feels_like < 0) {
                emoji = "🥶"
            }
            resp = `Dzisiejsza pogoda w mieście ${city} to ${json.weather[0].description}. Najniższa temperatura wyniesie ${json.main.temp_min}°C, a najwyższa ${json.main.temp_max}°C. Temperatura odczuwalna wyniesie ${json.main.feels_like}°C. ${emoji}`
        }
        agent.add(resp);
    }).catch(e => {
        console.log(e)
        agent.add("Ups, nie udało mi się sprawdzić pogody :(");
    })
}

app.get("/db", function (req, res) {
    trips.find({}, function (err, result) {
        if (err) {
            res.json({ "error": err });
        } else {
            console.log(`I found ${JSON.stringify(result)}`);
            res.json(result);
        }
    });
});

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log("Server is running on port " + port)
})