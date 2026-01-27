// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 追加
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCmYr4_XiE0or9et91ctkQDwQBo4CVDuB8",
  authDomain: "student-market-b2925.firebaseapp.com",
  projectId: "student-market-b2925",
  storageBucket: "student-market-b2925.firebasestorage.app",
  messagingSenderId: "549315987039",
  appId: "1:549315987039:web:fd0af5e88da79859dc3dea",
  measurementId: "G-K8GEYNBFWN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app); // 追加