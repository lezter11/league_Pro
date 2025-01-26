import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove,
  set,
  get,
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
let lastEntryKey = null;
let currentLeague = null;

function loadLeagues() {
  const leagueSelector = document.getElementById("league-selector");

  // Clear the dropdown before adding new options
  leagueSelector.innerHTML = '<option value="">Select a League</option>';

  onValue(
    ref(db, "leagues"),
    (snapshot) => {
      let activeLeague = null;
      let addedLeagues = new Set(); // Track added leagues to prevent duplicates

      snapshot.forEach((childSnapshot) => {
        const league = childSnapshot.key;
        const isActive = childSnapshot.child("active").val();

        if (!addedLeagues.has(league)) {
          const option = document.createElement("option");
          option.value = league;
          option.textContent = league;
          leagueSelector.appendChild(option);
          addedLeagues.add(league);
        }

        if (isActive) {
          activeLeague = league;
        }
      });

      if (activeLeague) {
        currentLeague = activeLeague;
        leagueSelector.value = activeLeague;
        fetchAndRenderMatches();
      }
    },
    { onlyOnce: true }
  ); // Ensures this runs only once when fetching data
}

// Update when league is selected manually
document
  .getElementById("league-selector")
  .addEventListener("change", function () {
    currentLeague = this.value;
    fetchAndRenderMatches();
  });

function createNewLeague() {
  const leagueName = prompt("Enter new league name:");
  if (leagueName) {
    set(ref(db, `leagues/${leagueName}`), { active: true });
    currentLeague = leagueName;
    loadLeagues();
  }
}

async function endLeague() {
  if (!currentLeague) {
    alert("No league selected");
    return;
  }

  let winningTeam = null;
  let maxPoints = -1;

  for (const team in tableData) {
    const teamData = tableData[team];
    if (teamData.points > maxPoints) {
      maxPoints = teamData.points;
      maxGoalDifference = teamData.goalsFor - teamData.goalsAgainst;
      winningTeam = team;
    } else if (teamData.points === maxPoints) {
      const goalDifference = teamData.goalsFor - teamData.goalsAgainst;
      if (goalDifference > maxGoalDifference) {
        maxGoalDifference = goalDifference;
        winningTeam = team;
      }
    }
  }

  if (winningTeam) {
    await set(ref(db, `leagues/${currentLeague}/winner`), winningTeam);
  }

  await set(ref(db, `leagues/${currentLeague}/active`), false);
  currentLeague = null;
  loadLeaderboard();
}

function loadLeaderboard() {
  const leaderboardList = document.getElementById("leaderboard-list");
  leaderboardList.innerHTML = "";

  onValue(ref(db, "leagues"), (snapshot) => {
    leaderboardList.innerHTML = "";

    snapshot.forEach((childSnapshot) => {
      const leagueName = childSnapshot.key;
      const winner = childSnapshot.child("winner").val();
      if (winner) {
        const listItem = document.createElement("li");
        listItem.textContent = `${leagueName}: ${winner}`;
        leaderboardList.appendChild(listItem);
      }
    });
  });
}

async function deleteLeague() {
  if (!currentLeague) {
    alert("No league selected.");
    return;
  }

  if (confirm(`Are you sure you want to delete league: ${currentLeague}?`)) {
    if (
      confirm(
        "This will permanently remove the league and all its data. Proceed?"
      )
    ) {
      try {
        await remove(ref(db, `leagues/${currentLeague}`));
        loadLeagues();
        currentLeague = null;
        alert("League deleted successfully.");
      } catch (error) {
        console.error("Error deleting league:", error);
        alert("Failed to delete league. Please try again.");
      }
    }
  }
}

async function clearAll() {
  if (!currentLeague) {
    alert("No league selected.");
    return;
  }

  const leagueRef = ref(db, `leagues/${currentLeague}/active`);
  const activeSnapshot = await get(leagueRef);

  if (!activeSnapshot.val()) {
    alert("This league has ended. Matches cannot be cleared.");
    return;
  }

  if (
    !confirm(
      `Are you sure you want to clear all matches for league: ${currentLeague}?`
    )
  ) {
    return;
  }

  if (!confirm("This action is irreversible. Do you still want to proceed?")) {
    return;
  }

  try {
    const matchesRef = ref(db, `leagues/${currentLeague}/matches`);
    await remove(matchesRef);
    tableData = {};
    lastEntryKey = null;
    renderTable();
    console.log(`All matches cleared for league: ${currentLeague}`);
  } catch (error) {
    console.error("Error clearing matches:", error);
    alert("Failed to clear matches. Please try again.");
  }
}

// Ensure the button properly triggers clearAll()
document.addEventListener("DOMContentLoaded", () => {
  const clearButton = document.getElementById("clear-matches-btn");
  if (clearButton) {
    clearButton.addEventListener("click", clearAll);
  }
});

async function addMatch() {
  if (!currentLeague) {
    alert("Select or create a league first");
    return;
  }

  const leagueRef = ref(db, `leagues/${currentLeague}/active`);
  const activeSnapshot = await get(leagueRef);

  if (!activeSnapshot.val()) {
    alert("This league has ended. No further matches can be added.");
    return;
  }

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

    const newMatchRef = await push(
      ref(db, `leagues/${currentLeague}/matches`),
      matchData
    );
    lastEntryKey = newMatchRef.key;
    console.log("Match added to Realtime Database with key:", lastEntryKey);

    document.getElementById("team1-score").value = "0";
    document.getElementById("team2-score").value = "0";
  } catch (error) {
    console.error("Error adding match: ", error);
    alert("Failed to add match. Please try again.");
  }
}

async function undo() {
  if (!lastEntryKey) {
    alert("No last entry to undo.");
    return;
  }

  try {
    await remove(ref(db, `leagues/${currentLeague}/matches/${lastEntryKey}`));
    console.log("Last entry removed:", lastEntryKey);
    lastEntryKey = null;
  } catch (error) {
    console.error("Error undoing last entry:", error);
    alert("Failed to undo the last entry. Please try again.");
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
  if (!currentLeague) {
    console.log("No league selected or running.");
    return;
  }

  const matchesRef = ref(db, `leagues/${currentLeague}/matches`);
  onValue(matchesRef, (snapshot) => {
    tableData = {};
    const matches = [];

    snapshot.forEach((childSnapshot) => {
      const match = childSnapshot.val();
      matches.push(match);
      updateTeamStats(match.team1, match.team1Score, match.team2Score);
      updateTeamStats(match.team2, match.team2Score, match.team1Score);
    });

    renderTable();
    renderMatchHistory(matches);
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

// Ensure the page loads with the currently running league
document.addEventListener("DOMContentLoaded", () => {
  loadLeagues();
  loadLeaderboard();
  init();
});

window.createNewLeague = createNewLeague;
window.endLeague = endLeague;
window.deleteLeague = deleteLeague;
window.clearAll = clearAll;
window.addMatch = addMatch;
window.undo = undo;