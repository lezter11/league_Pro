import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "https://league-pro-87d49-default-rtdb.firebaseio.com/",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let tableData = {};

// Add Match Function
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

// Fetch and Render Matches
function fetchAndRenderMatches() {
  const matchesRef = ref(db, "matches");

  onValue(matchesRef, (snapshot) => {
    tableData = {};

    snapshot.forEach((childSnapshot) => {
      const match = childSnapshot.val();
      updateTeamStats(match.team1, match.team1Score, match.team2Score);
      updateTeamStats(match.team2, match.team2Score, match.team1Score);
    });

    renderTable();
  });
}

// Update Team Stats
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

// Render Table
function renderTable() {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  const sortedTeams = Object.keys(tableData).sort((a, b) => {
    if (tableData[b].points === tableData[a].points) {
      return tableData[b].goalsFor - tableData[a].goalsFor;
    }
    return tableData[b].points - tableData[a].points;
  });

  sortedTeams.forEach((team) => {
    const stats = tableData[team];
    const row = document.createElement("tr");
    const goalDifference = stats.goalsFor - stats.goalsAgainst;

    row.innerHTML = `
      <td>${team}</td>
      <td>${stats.played}</td>
      <td>${stats.won}</td>
      <td>${stats.drawn}</td>
      <td>${stats.lost}</td>
      <td>${stats.goalsFor}</td>
      <td>${stats.goalsAgainst}</td>
      <td>${goalDifference}</td>
      <td>${stats.points}</td>
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
function init() {
  fetchAndRenderMatches();
  setupAudio();
}

window.addMatch = addMatch;

document.addEventListener("DOMContentLoaded", init);
