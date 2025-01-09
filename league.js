import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// Firebase Configuration (REPLACE WITH YOUR CREDENTIALS)
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

let tableData = {};
let lastEntryKey = null; // To track the last added match for the undo functionality

// Add Match to the Firebase Database
async function addMatch() {
  const team1 = document.getElementById("team1").value.trim();
  const team2 = document.getElementById("team2").value.trim();
  const team1Score = parseInt(document.getElementById("team1-score").value);
  const team2Score = parseInt(document.getElementById("team2-score").value);

  if (!team1 || !team2 || isNaN(team1Score) || isNaN(team2Score)) {
    alert("Please fill out all fields correctly.");
    return;
  }

  if (team1 === team2) {
    alert("Please select different teams.");
    return;
  }

  try {
    const matchData = {
      team1,
      team2,
      team1Score,
      team2Score,
      timestamp: new Date().toISOString(),
    };

    const newMatchRef = await push(ref(db, "matches"), matchData);
    lastEntryKey = newMatchRef.key; // Save the key of the last added match for undo
    console.log("Match added to Realtime Database with key:", lastEntryKey);

    // Reset score inputs after successful addition
    document.getElementById("team1-score").value = "0";
    document.getElementById("team2-score").value = "0";
  } catch (error) {
    console.error("Error adding match: ", error);
    alert("Failed to add match. Please try again.");
  }
}

// Undo the Last Match Entry
async function undo() {
  if (!lastEntryKey) {
    alert("No last entry to undo.");
    return;
  }

  try {
    await remove(ref(db, `matches/${lastEntryKey}`));
    console.log(
      "Last entry removed from Realtime Database with key:",
      lastEntryKey
    );
    lastEntryKey = null; // Clear the key after successful undo
  } catch (error) {
    console.error("Error undoing last entry: ", error);
    alert("Failed to undo the last entry. Please try again.");
  }
}

// Clear All Matches from Firebase and Table
async function clearAll() {
  if (
    confirm(
      "Are you sure you want to clear all matches? This action cannot be undone."
    )
  ) {
    try {
      const matchesRef = ref(db, "matches");
      await remove(matchesRef);
      tableData = {};
      lastEntryKey = null; // Clear last entry key on full reset
      renderTable();
      console.log("All matches cleared from Realtime Database");
    } catch (error) {
      console.error("Error clearing matches:", error);
      alert("Failed to clear matches. Please try again.");
    }
  }
}

// Update Team Statistics
function updateTeamStats(team, goalsFor, goalsAgainst) {
  if (!tableData[team]) {
    tableData[team] = {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      form: [], // Array to track the last 5 matches (win, draw, loss)
    };
  }

  const teamStats = tableData[team];
  teamStats.played++;
  teamStats.goalsFor += goalsFor;
  teamStats.goalsAgainst += goalsAgainst;

  if (goalsFor > goalsAgainst) {
    teamStats.won++;
    teamStats.points += 3;
    teamStats.form.unshift("win");
  } else if (goalsFor === goalsAgainst) {
    teamStats.drawn++;
    teamStats.points += 1;
    teamStats.form.unshift("draw");
  } else {
    teamStats.lost++;
    teamStats.form.unshift("loss");
  }

  // Limit form history to the last 5 matches
  if (teamStats.form.length > 5) {
    teamStats.form.pop();
  }
}

// Render League Table
function renderTable() {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  const sortedTeams = Object.entries(tableData).sort(
    ([, a], [, b]) => b.points - a.points
  );

  sortedTeams.forEach(([team, stats], index) => {
    const goalDifference = stats.goalsFor - stats.goalsAgainst;
    const formHtml = stats.form
      .map((result) => {
        if (result === "win")
          return '<span class="form-circle form-win"></span>';
        if (result === "draw")
          return '<span class="form-circle form-draw"></span>';
        if (result === "loss")
          return '<span class="form-circle form-loss"></span>';
        return "";
      })
      .join("");

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td class="club"><img src="${team}.jpg" alt="${team} logo" /> ${team}</td>
      <td>${stats.played}</td>
      <td>${stats.won}</td>
      <td>${stats.drawn}</td>
      <td>${stats.lost}</td>
      <td>${stats.goalsFor}</td>
      <td>${stats.goalsAgainst}</td>
      <td>${goalDifference}</td>
      <td>${stats.points}</td>
      <td>${formHtml}</td>
    `;
    tbody.appendChild(row);
  });

  console.log("Table rendered");
}

// Render Match History
function renderMatchHistory(matches) {
  const matchHistoryBody = document.getElementById("match-history-body");
  matchHistoryBody.innerHTML = "";

  matches.forEach((match) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${match.team1}</td>
      <td>${match.team1Score}</td>
      <td>${match.team2}</td>
      <td>${match.team2Score}</td>
    `;
    matchHistoryBody.appendChild(row);
  });

  console.log("Match history rendered.");
}

// Fetch Matches from Firebase and Render
function fetchAndRenderMatches() {
  const matchesRef = ref(db, "matches");

  onValue(matchesRef, (snapshot) => {
    tableData = {};
    const matches = []; // For match history rendering

    snapshot.forEach((childSnapshot) => {
      const match = childSnapshot.val();
      matches.push(match); // Add match to match history array
      if (!tableData[match.team1]) updateTeamStats(match.team1, 0, 0);
      if (!tableData[match.team2]) updateTeamStats(match.team2, 0, 0);

      updateTeamStats(match.team1, match.team1Score, match.team2Score);
      updateTeamStats(match.team2, match.team2Score, match.team1Score);
    });

    renderTable();
    renderMatchHistory(matches); // Render match history
  });
}

// Initialize Application
function init() {
  fetchAndRenderMatches();

  const matchHistoryButton = document.getElementById("match-history-btn");
  matchHistoryButton.addEventListener("click", () => {
    const matchHistorySection = document.getElementById("match-history");
    matchHistorySection.style.display =
      matchHistorySection.style.display === "none" ||
      !matchHistorySection.style.display
        ? "block"
        : "none";
  });
}

window.addMatch = addMatch;
window.clearAll = clearAll;
window.undo = undo; // Make undo globally accessible

document.addEventListener("DOMContentLoaded", init);
