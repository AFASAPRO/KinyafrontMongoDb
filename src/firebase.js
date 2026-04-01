import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAQI8OoVAqENGd1O68XmISA-K8uLdmr9oI",
  authDomain: "kinyabot-92ad1.firebaseapp.com",
  projectId: "kinyabot-92ad1",
  storageBucket: "kinyabot-92ad1.firebasestorage.app",
  messagingSenderId: "13508775814",
  appId: "1:13508775814:web:7c910d0f1903ac1f6fe607"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
