// Public website Firebase bridge. Firebase is optional on static pages.
const firebaseConfig = {
  apiKey: "AIzaSyCxi_WSiJjC6xCk5pSTY3jORACw3MhdYUk",
  authDomain: "aum-tech-company.firebaseapp.com",
  projectId: "aum-tech-company",
  storageBucket: "aum-tech-company.firebasestorage.app",
  messagingSenderId: "806356829119",
  appId: "1:806356829119:web:27981d6b397be62701970a",
  measurementId: "G-H8CNLY650J"
};
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  window.AUM_DB = firebase.firestore();
}
