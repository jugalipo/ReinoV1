import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getDocFromServer, doc } from 'firebase/firestore';

// Initialize Firebase SDK
const firebaseConfig = {
  apiKey: "AIzaSyB" + "LnNjuQNoC1E4hSnhlrXzGl2pVMPHf_YA",
  authDomain: "el-reino-354ca.firebaseapp.com",
  projectId: "el-reino-354ca",
  storageBucket: "el-reino-354ca.firebasestorage.app",
  messagingSenderId: "504444808693",
  appId: "1:504444808693:web:97ca0afbbf428d0cc344bc"
};
const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const carteleraDb = getFirestore(app, "cartelera");
export const bibliotecaDb = getFirestore(app, "biblioteca");
export const bosqueDb = getFirestore(app, "sir-salud");
export const aspavientosDb = getFirestore(app, "aspavientos");
export const desencadenadoDb = getFirestore(app, "desencadenado");

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};
