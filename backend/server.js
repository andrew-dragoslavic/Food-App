const express = require("express")
const cors = require("cors")
const dotenv = require("dotenv")
const connectDB = require("./database.js")
const authRoutes = require('./auth.js')

const app = express()
dotenv.config()

app.use(cors())
app.use(express.json())
async function startServer() {
    await connectDB('food-app')

    app.use('/api/auth', authRoutes)

    app.get("/api/test", (req, res) => {
        res.json({
            message: "Backend is working!"
        })
    });

    app.listen(5000, () => {
        console.log(`Server listening on port 5000`);
    }); 
}
startServer();


