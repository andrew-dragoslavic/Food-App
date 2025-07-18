const firebase = require('firebase-admin');
const serviceAccount = require('./food-app.json');

firebase.initializeApp(
    {
        credential: firebase.credential.cert(serviceAccount),
    }
)

module.exports = firebase;
