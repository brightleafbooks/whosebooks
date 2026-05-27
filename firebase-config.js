import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBDnZtMT77273veCDtEXCTfl8byBAc1LFA",
  authDomain: "whose-books.firebaseapp.com",
  projectId: "whose-books",
  messagingSenderId: "527328892877",
  appId: "1:527328892877:web:eb288ac8b5666bcf5f5684",
  measurementId: "G-HFWY85K6E0"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
