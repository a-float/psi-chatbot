const mongoose = require('mongoose');

//Set up default mongoose connection
const uri = `mongodb+srv://matt:${process.env.DB_KEY}@cluster0.oycfb.mongodb.net/TravelioDatabase?retryWrites=true&w=majority`
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

const connection = mongoose.connection;

connection.once("open", function () {
    console.log("MongoDB database connection established successfully");
});
connection.on('error', console.error.bind(console, 'MongoDB connection error:'));

const Schema = mongoose.Schema;

let trip = new Schema(
    {
        name: {
            type: String
        },
        place: {
            type: String
        },
        climate: {
            type: String
        },
        date: {
            type: Date
        },
    },
    { collection: "trips" }
);

module.exports = mongoose.model("trips", trip);