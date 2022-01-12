require('dotenv').config()
const fetch = require('node-fetch')
const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const { Image, Text } = require('dialogflow-fulfillment')
const trips = require("./trips")
const util = require("util")
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
    intentMap.set('Default Fallback', handleChooseOffer)
    intentMap.set('Reserve yes', handleReserveYes)
    agent.handleRequest(intentMap)
})

function handleReserveYes(agent){
    context = agent.context.get('chosen-trip')
    tripname = context.tripname
    console.log(context, tripname)
    agent.add(`Super!\nZa moment wyślę Ci potwierdzenie Twojej rezerwacji miejsca na wycieczkę "${tripname}"`)
}

function handleChooseOffer(agent) {
    console.log(agent.contexts);
    if (agent.contexts.find(ele => ele.name == "want-trip") != undefined) {
        console.log("Fallback wants brings the trip!");
        const name = agent.query
        console.log("Choose offer " + JSON.stringify(agent.contexts))
        return getOffers(name).then(results => {
            if (results.length == 1) {
                const trip = results[0]
                agent.add(`Oferta ${trip.name} wyrusza ${prettyDate(trip.date)} z ${trip.place}.`)
                agent.add("Czy chciałbyś złożyć rezerwację?")
                context = { name: "chosen-trip", lifespan: 1, tripname: trip.name }
                agent.context.set(context)
            } else {
                context = { name: "want-trip", lifespan: 1 }
                agent.context.set(context)
                agent.add("Nie kojarzę takiej oferty :c")
            }
        }).catch(err => {
            console.log(err)
            agent.add("Ups, coś poszło nie tak...")
        })
    }
}

function removePolish(string) {
    const from = ["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ż", "ź", "Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ż", "Ź"]
    const to = ["a", "c", "e", "l", "n", "o", "s", "z", "z", "A", "C", "E", "L", "N", "O", "S", "Z", "Z"]
    for (let i = 0; i < from.length; i++) {
        string = string.replace(from[i], to[i])
    }
    return string
}

function prettyDate(dateString) {
    let date = new Date(dateString)
    let day = date.getDate() + 1
    let month = date.getMonth() + 1
    let year = date.getFullYear() + 1
    return `${day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`
}

function getOffers(name = "") {
    const options = {}
    if (name) options.name = name
    return trips.find(options).exec().then(results => {
        return Promise.resolve(results)
    }).catch(err => {
        console.log(err)
        return Promise.reject(err)
    })
}

function handleOffersRequest(agent) {
    console.log("Offers request " + JSON.stringify(agent.parameters));
    return getOffers().then(result => {
        if (result.length > 0) {
            const options = result.map(r => `${prettyDate(r.date)} - "${r.name}"\n`).join('')
            agent.add("W najbliższym czasie oferujemy następujące wycieczi:\n" + options + "Czy któraś z nich Cię interesuje?")
        } else {
            agent.add("Niestety nie mamy obecnie dostępnych żadnych ofert.")
        }
    }).catch(err => {
        console.log(err)
        agent.add("Ups, zapomniałem jakie są oferty. Może zaraz sobie je przypomnę...")
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