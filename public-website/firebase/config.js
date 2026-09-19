// Compatibility bridge for pages that still reference the lowercase public-website path.
const firebaseConfig = {
  apiKey: "AIzaSyCxi_WSiJjC6xCk5pSTY3jORACw3MhdYUk",
  authDomain: "aum-tech-company.firebaseapp.com",
  projectId: "aum-tech-company",
  storageBucket: "aum-tech-company.firebasestorage.app",
  messagingSenderId: "806356829119",
  appId: "1:806356829119:web:27981d6b397be62701970a",
  measurementId: "G-H8CNLY650J"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
window.AUM_DB = firebase.firestore();
