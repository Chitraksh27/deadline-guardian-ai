import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

// Standardize scopes for Google calendar/etc. if needed later, but standard OpenID scopes are set by default
googleAuthProvider.addScope('openid');
googleAuthProvider.addScope('email');
googleAuthProvider.addScope('profile');
