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
tableData.previousData = null;

// async function addMatch() {
//   // ... (Existing addMatch code)
//   try {
//     tableData.previousData = JSON.parse(JSON.stringify(tableData));
//     // ... (Rest of addMatch code)
//   } catch (error) {
//     // ...
//   }
// }

async function addMatch() {
  const team1 = document.getElementById("team1").value.trim().toLowerCase();
  const team2 = document.getElementById("team2").value.trim().toLowerCase();
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
    // Store previous data *before* making changes
    tableData.previousData = JSON.parse(JSON.stringify(tableData));

    const matchData = {
      team1,
      team2,
      team1Score,
      team2Score,
      timestamp: new Date().toISOString(),
    };

    await push(ref(db, "matches"), matchData);
    console.log("Match added to Realtime Database");

    document.getElementById("team1-score").value = "0";
    document.getElementById("team2-score").value = "0";
  } catch (error) {
    console.error("Error adding match: ", error);
    alert("Failed to add match. Please try again.");
  }
}

function updateTeamStatsFromTableData() {
  for (const team in tableData) {
    const stats = tableData[team];
    updateTeamStats(team, stats.goalsFor, stats.goalsAgainst);
  }
}

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
    };
  }

  const teamStats = tableData[team];
  teamStats.played++;
  teamStats.goalsFor += goalsFor;
  teamStats.goalsAgainst += goalsAgainst;

  if (goalsFor > goalsAgainst) {
    teamStats.won++;
    teamStats.points += 3;
  } else if (goalsFor === goalsAgainst) {
    teamStats.drawn++;
    teamStats.points += 1;
  } else {
    teamStats.lost++;
  }
}

function undo() {
  if (tableData.previousData) {
    tableData = JSON.parse(JSON.stringify(tableData.previousData)); // Deep copy to avoid reference issues
    tableData.previousData = null;
    renderTable();
    console.log("Last entry undone!");
  } else {
    alert("No previous entry to undo.");
  }
}

async function clearAll() {
  if (
    confirm(
      "Are you sure you want to clear all matches? This action cannot be undone."
    )
  ) {
    try {
      const matchesRef = ref(db, "matches");
      await remove(matchesRef);
      tableData = {}; // Reset tableData
      tableData.previousData = null;
      renderTable();
      console.log("All matches cleared from Realtime Database");
    } catch (error) {
      console.error("Error clearing matches:", error);
      alert("Failed to clear matches. Please try again.");
    }
  }
}

// Render Table
function renderTable() {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  // 1. Filter out non-team entries and create a copy for sorting
  const teamEntries = Object.entries(tableData).filter(([key, value]) => {
    return (
      typeof value === "object" &&
      value !== null &&
      value.hasOwnProperty("points")
    );
  });

  // 2. Sort the filtered team entries
  const sortedTeams = teamEntries.sort(([, teamA], [, teamB]) => {
    const pointsA = teamA.points ?? 0; // Nullish coalescing operator
    const pointsB = teamB.points ?? 0;
    if (pointsB === pointsA) {
      return (teamB.goalsFor ?? 0) - (teamA.goalsFor ?? 0); // Safe access for goalsFor as well
    }
    return pointsB - pointsA;
  });

  // 3. Render the sorted teams
  sortedTeams.forEach(([team, stats]) => {
    const goalDifference = (stats.goalsFor ?? 0) - (stats.goalsAgainst ?? 0); // Safe access
    const row = document.createElement("tr");

    row.innerHTML = `
          <td>${team}</td>
          <td>${stats.played ?? 0}</td>
          <td>${stats.won ?? 0}</td>
          <td>${stats.drawn ?? 0}</td>
          <td>${stats.lost ?? 0}</td>
          <td>${stats.goalsFor ?? 0}</td>
          <td>${stats.goalsAgainst ?? 0}</td>
          <td>${goalDifference}</td>
          <td>${stats.points ?? 0}</td>
      `;
    tbody.appendChild(row);
  });

  console.log("Table rendered");
}

// Audio Setup Function
function setupAudio() {
  const audio = document.getElementById("background-audio");
  const muteButton = document.getElementById("mute-button");

  audio.currentTime = 0;
  audio.volume = 0.3;
  audio.loop = true;

  muteButton.addEventListener("click", () => {
    if (audio.muted) {
      audio.muted = false;
      muteButton.textContent = "Mute";
    } else {
      audio.muted = true;
      muteButton.textContent = "Unmute";
    }
  });
}

// Initialize the App
function fetchAndRenderMatches() {
  const matchesRef = ref(db, "matches");

  onValue(matchesRef, (snapshot) => {
    tableData = {};
    tableData.previousData = null; // Important: Reset previous data on new data fetch
    snapshot.forEach((childSnapshot) => {
      const match = childSnapshot.val();
      updateTeamStats(match.team1, match.team1Score, match.team2Score);
      updateTeamStats(match.team2, match.team2Score, match.team1Score);
    });
    renderTable();
  });
}

function init() {
  fetchAndRenderMatches();
  setupAudio();
}

window.addMatch = addMatch;
window.undo = undo;
window.clearAll = clearAll;

document.addEventListener("DOMContentLoaded", init);
