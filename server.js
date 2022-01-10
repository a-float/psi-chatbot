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
    let agent = new WebhookClient({ request: req, response: res })    // create intentMap for handle intent
    let intentMap = new Map();    // add intent map 2nd parameter pass function
    // intentMap.set('Powitanie', handleWebHookIntent)    // now agent is handle request and pass intent map
    agent.handleRequest(intentMap)
})

function handleWebHookIntent(agent) {
    agent.add("Hello I am Webhook demo How are you...")
}

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log("Server is running on port " + port)
})