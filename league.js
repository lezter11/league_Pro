// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Your Firebase Config (Replace with your project details)
const firebaseConfig = {
  apiKey: "AIzaSyCem2XqvF5MmMVvuzU3-BtDUm4Rit1-3D0",
  authDomain: "league-pro-87d49.firebaseapp.com",
  projectId: "league-pro-87d49",
  storageBucket: "league-pro-87d49.appspot.com",
  messagingSenderId: "483379670611",
  appId: "1:483379670611:web:4723894f707f7d261f20a6",
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Local Data Store
let tableData = {}; // Changed from const to let

// Add Match Function
export async function addMatch() {
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
    // Save match to Firestore
    const docRef = await addDoc(collection(db, "matches"), {
      team1,
      team2,
      team1Score,
      team2Score,
    });
    console.log("Match added with ID: ", docRef.id);
    
    // Refresh data after adding match
    await fetchData();
  } catch (error) {
    console.error("Error adding match:", error);
  }
}

// Fetch Data from Firestore
async function fetchData() {
  const querySnapshot = await getDocs(collection(db, "matches"));
  tableData = {}; // Reset local data

  querySnapshot.forEach((doc) => {
    const match = doc.data();

    // Update stats for both teams
    updateTeamStats(match.team1, match.team1Score, match.team2Score);
    updateTeamStats(match.team2, match.team2Score, match.team1Score);
  });

  renderTable();
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

// Delete Match Function
async function deleteMatch(matchId) {
  try {
    await deleteDoc(doc(db, "matches", matchId));
    console.log("Match deleted:", matchId);
    fetchData(); // Refresh data after deletion
  } catch (error) {
    console.error("Error deleting match:", error);
  }
}

// Audio Setup Function
function setupAudio() {
  const audio = document.getElementById("background-audio");
  const muteButton = document.getElementById("mute-button");

  audio.currentTime = 0; // Start from the beginning
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

// Initialize App
async function init() {
  await fetchData(); // Fetch initial data
  setupAudio(); // Setup audio
}

document.addEventListener("DOMContentLoaded", init);

// Expose addMatch to global window object
window.addMatch = addMatch;
