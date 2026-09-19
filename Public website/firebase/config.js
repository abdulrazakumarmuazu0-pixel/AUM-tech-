// ============================================================
// AUM TECHNOLOGY — Firebase Configuration
// Project: aum-tech-company
// ✅ Connected: 2026-09-18
// ⚠️ NEXT STEP: Deploy Firestore Rules (Firebase Console →
//    Firestore → Rules → paste from firestore.rules → Publish)
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCxi_WSiJjC6xCk5pSTY3jORACw3MhdYUk",
  authDomain: "aum-tech-company.firebaseapp.com",
  projectId: "aum-tech-company",
  storageBucket: "aum-tech-company.firebasestorage.app",
  messagingSenderId: "806356829119",
  appId: "1:806356829119:web:27981d6b397be62701970a",
  measurementId: "G-H8CNLY650J"
};

firebase.initializeApp(firebaseConfig);
window.AUM_DB = firebase.firestore();

// Firestore collections used by the platform:
//   leads, newsletter        → public website forms
//   users, clients           → portal registrations
//   projects, invoices, payments, tickets, messages, notifications, contracts, proposals, files
//   tasks, expenses, employees, timeLogs
//   repos, environments, deployments, apiKeys, devLogs, monitors
//   auditLogs, settings, roles, blog, portfolio, testimonials
