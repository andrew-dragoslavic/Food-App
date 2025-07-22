// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLOnZk2n5j6hWvUp94rM6bJclHMsGXxcQ",
  authDomain: "food-app-57687.firebaseapp.com",
  projectId: "food-app-57687",
  storageBucket: "food-app-57687.firebasestorage.app",
  messagingSenderId: "961555492193",
  appId: "1:961555492193:web:a61b1e5589d0070e892920",
  measurementId: "G-QEDLFD90E8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);