const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

// Your Firebase config here:
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "https://league-pro-87d49-default-rtdb.firebaseio.com/",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function exportMatches() {
  const leaguesSnap = await get(ref(db, 'leagues'));
  if (!leaguesSnap.exists()) {
    console.log('No leagues found.');
    return;
  }

  let csv = 'season,team1,team1Score,team2,team2Score,timestamp\n';

  leaguesSnap.forEach(leagueSnap => {
    const season = leagueSnap.key;
    const matches = leagueSnap.child('matches');
    if (matches.exists()) {
      matches.forEach(matchSnap => {
        const match = matchSnap.val();
        csv += [
          season,
          match.team1,
          match.team1Score,
          match.team2,
          match.team2Score,
          match.timestamp
        ].join(',') + '\n';
      });
    }
  });

  fs.writeFileSync('league_matches_backup.csv', csv);
  console.log('Backup complete: league_matches_backup.csv');
}

exportMatches();