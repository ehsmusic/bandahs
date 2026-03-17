import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAvckg0DigoBY2UnBI1G9eb4KTM-IDfPwU",
  authDomain: "n8nhs-417be.firebaseapp.com",
  projectId: "n8nhs-417be",
  storageBucket: "n8nhs-417be.firebasestorage.app",
  messagingSenderId: "732822840364",
  appId: "1:732822840364:web:754e3c8ab0f48a1cf6dd89"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
