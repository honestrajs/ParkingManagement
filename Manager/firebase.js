// firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDQ3l93C29KTVnQYpw_ssMvJa_2AgW0HII",
  authDomain: "bike-stand-14fdb.firebaseapp.com",
  databaseURL: "https://bike-stand-14fdb-default-rtdb.firebaseio.com",
  projectId: "bike-stand-14fdb",
  storageBucket: "bike-stand-14fdb.appspot.com",
  messagingSenderId: "1028270027899",
  appId: "1:1028270027899:android:3f314f9e8e5f639c68dede"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);