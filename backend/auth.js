const express = require('express');
const firebase = require('./firebase.js');
const connectDB = require('./database.js');

const router = express.Router();

async function verfiyToken(req, res, next) {

    try {
        // Check if authorization header exists
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Check if it starts with "Bearer "
        if (!req.headers.authorization.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Invalid token format' });
        }
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = await firebase.auth().verifyIdToken(token)
        req.user = decodedToken;
        next()
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

router.get('/profile', verfiyToken, (req, res) => {
    res.json({user: req.user})
})

router.post('/register', async (req, res) => {
    res.json({message: "Registration"})
})

router.post('/login', async (req, res) => {
    res.json({message: "Login"})
})

module.exports = router;