const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB(db_name) {
    try {
        await client.connect();
        console.log("Connected!")
    } catch (e) {
        console.error(e);
    }
    return client.db(db_name);
}

module.exports = connectDB;