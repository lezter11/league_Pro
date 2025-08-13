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
let headToHeadData = {};
let overallHeadToHeadData = {};

function loadLeagues() {
  const leagueSelector = document.getElementById("league-selector");

  // Clear the dropdown before adding new options
  leagueSelector.innerHTML = '<option value="">Select a League</option>';

  onValue(
    ref(db, "leagues"),
    (snapshot) => {
      let activeLeague = null;
      let leagues = [];

      snapshot.forEach((childSnapshot) => {
        const league = childSnapshot.key;
        const isActive = childSnapshot.child("active").val();
        leagues.push({ name: league, isActive });

        if (isActive) {
          activeLeague = league;
        }
      });

      // Sort leagues numerically (Season 1, Season 2, etc.)
      leagues.sort((a, b) => {
        const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0');
        return aNum - bNum;
      });

      // Add sorted leagues to dropdown
      leagues.forEach(({ name }) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        leagueSelector.appendChild(option);
      });

      if (activeLeague) {
        currentLeague = activeLeague;
        leagueSelector.value = activeLeague;
        fetchAndRenderMatches();
        displayCurrentSeasonWinner();
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
    displayCurrentSeasonWinner();
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
    if (tableData[team].points > maxPoints) {
      maxPoints = tableData[team].points;
      winningTeam = team;
    }
  }

  if (winningTeam) {
    await set(ref(db, `leagues/${currentLeague}/winner`), winningTeam);
    await set(ref(db, `leagues/${currentLeague}/winnerPoints`), maxPoints);
  }

  await set(ref(db, `leagues/${currentLeague}/active`), false);
  currentLeague = null;
  loadLeaderboard();
  displayCurrentSeasonWinner();
}

function loadLeaderboard() {
  const leaderboardList = document.getElementById("leaderboard-list");
  leaderboardList.innerHTML = "";

  onValue(ref(db, "leagues"), (snapshot) => {
    leaderboardList.innerHTML = "";
    
    // Count wins for each player
    const winCounts = {};
    
    snapshot.forEach((childSnapshot) => {
      const leagueName = childSnapshot.key;
      const winner = childSnapshot.child("winner").val();
      if (winner) {
        winCounts[winner] = (winCounts[winner] || 0) + 1;
      }
    });

    // Create winner counter table
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "10px";
    
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Player</th>
      <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Seasons Won</th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement("tbody");
    Object.entries(winCounts).forEach(([player, wins]) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${player}</td>
        <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white; font-weight: bold;">${wins}</td>
      `;
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    leaderboardList.appendChild(table);
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
    
    // The overall head-to-head data will be updated automatically via the Firebase listener
    // No need to manually reload it
    
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

    // The overall head-to-head data will be updated automatically via the Firebase listener
    // No need to manually update it here

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
    
    // The overall head-to-head data will be updated automatically via the Firebase listener
    // No need to manually reload it
  } catch (error) {
    console.error("Error undoing last entry:", error);
    alert("Failed to undo the last entry. Please try again.");
  }
}

// Update Head-to-Head Statistics
function updateHeadToHead(team1, team2, team1Score, team2Score) {
  const key = [team1, team2].sort().join(' vs ');
  
  if (!headToHeadData[key]) {
    headToHeadData[key] = {
      matches: 0,
      [team1]: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
      [team2]: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
    };
  }
  
  const h2h = headToHeadData[key];
  h2h.matches++;
  
  // Update team1 stats
  h2h[team1].goalsFor += team1Score;
  h2h[team1].goalsAgainst += team2Score;
  
  // Update team2 stats
  h2h[team2].goalsFor += team2Score;
  h2h[team2].goalsAgainst += team1Score;
  
  if (team1Score > team2Score) {
    h2h[team1].wins++;
    h2h[team2].losses++;
  } else if (team1Score === team2Score) {
    h2h[team1].draws++;
    h2h[team2].draws++;
  } else {
    h2h[team1].losses++;
    h2h[team2].wins++;
  }
}

// Update Overall Head-to-Head Statistics (All Seasons)
function updateOverallHeadToHead(team1, team2, team1Score, team2Score) {
  const key = [team1, team2].sort().join(' vs ');
  
  if (!overallHeadToHeadData[key]) {
    overallHeadToHeadData[key] = {
      matches: 0,
      [team1]: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
      [team2]: { wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
    };
  }
  
  const h2h = overallHeadToHeadData[key];
  h2h.matches++;
  
  // Update team1 stats
  h2h[team1].goalsFor += team1Score;
  h2h[team1].goalsAgainst += team2Score;
  
  // Update team2 stats
  h2h[team2].goalsFor += team2Score;
  h2h[team2].goalsAgainst += team1Score;
  
  if (team1Score > team2Score) {
    h2h[team1].wins++;
    h2h[team2].losses++;
  } else if (team1Score === team2Score) {
    h2h[team1].draws++;
    h2h[team2].draws++;
  } else {
    h2h[team1].losses++;
    h2h[team2].wins++;
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

// Render Head-to-Head Table
function renderHeadToHeadTable() {
  console.log("renderHeadToHeadTable called");
  const headToHeadSection = document.getElementById("head-to-head-section");
  if (!headToHeadSection) {
    console.log("head-to-head-section not found");
    return;
  }
  console.log("headToHeadData:", headToHeadData);
  
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.marginTop = "10px";
  
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Matchup</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Matches Played</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Remaining</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Wins</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Draws</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Goals For</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Goals Against</th>
  `;
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement("tbody");
  Object.entries(headToHeadData).forEach(([matchup, data]) => {
    const [team1, team2] = matchup.split(' vs ');
    const team1Stats = data[team1];
    const team2Stats = data[team2];
    const maxMatches = 19; // Each player plays 19 matches against each other
    const remaining = maxMatches - data.matches;
    
    // Team 1 row
    const row1 = document.createElement("tr");
    row1.innerHTML = `
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white; font-weight: bold;">${team1}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${data.matches}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white; ${remaining > 0 ? 'color: #ffeb3b;' : 'color: #4caf50;'}">${remaining}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team1Stats.wins}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team1Stats.draws}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team1Stats.goalsFor}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team1Stats.goalsAgainst}</td>
    `;
    tbody.appendChild(row1);
    
    // Team 2 row
    const row2 = document.createElement("tr");
    row2.innerHTML = `
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white; font-weight: bold;">${team2}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${data.matches}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white; ${remaining > 0 ? 'color: #ffeb3b;' : 'color: #4caf50;'}">${remaining}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team2Stats.wins}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team2Stats.draws}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team2Stats.goalsFor}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team2Stats.goalsAgainst}</td>
    `;
    tbody.appendChild(row2);
    
    // Empty row for spacing
    const spacerRow = document.createElement("tr");
    spacerRow.innerHTML = '<td colspan="7" style="padding: 4px; background: transparent;"></td>';
    tbody.appendChild(spacerRow);
  });
  table.appendChild(tbody);
  
  headToHeadSection.innerHTML = "";
  headToHeadSection.appendChild(table);
}

// Render Overall Head-to-Head Table (All Seasons)
function renderOverallHeadToHeadTable() {
  console.log("renderOverallHeadToHeadTable called");
  const overallHeadToHeadSection = document.getElementById("overall-head-to-head-section");
  if (!overallHeadToHeadSection) {
    console.log("overall-head-to-head-section not found");
    return;
  }
  console.log("overallHeadToHeadData:", overallHeadToHeadData);
  
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.marginTop = "10px";
  
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Matchup</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Total Matches</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Wins</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Draws</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Goals For</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Goals Against</th>
    <th style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.2); color: white;">Win Rate</th>
  `;
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement("tbody");
  Object.entries(overallHeadToHeadData).forEach(([matchup, data]) => {
    const [team1, team2] = matchup.split(' vs ');
    const team1Stats = data[team1];
    const team2Stats = data[team2];
    
    // Calculate win rates
    const team1WinRate = data.matches > 0 ? ((team1Stats.wins / data.matches) * 100).toFixed(1) : '0.0';
    const team2WinRate = data.matches > 0 ? ((team2Stats.wins / data.matches) * 100).toFixed(1) : '0.0';
    
    // Team 1 row
    const row1 = document.createElement("tr");
    row1.innerHTML = `
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white; font-weight: bold;">${team1}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${data.matches}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team1Stats.wins}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team1Stats.draws}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team1Stats.goalsFor}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team1Stats.goalsAgainst}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team1WinRate}%</td>
    `;
    tbody.appendChild(row1);
    
    // Team 2 row
    const row2 = document.createElement("tr");
    row2.innerHTML = `
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white; font-weight: bold;">${team2}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${data.matches}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team2Stats.wins}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team2Stats.draws}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team2Stats.goalsFor}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team2Stats.goalsAgainst}</td>
      <td style="padding: 8px; border: 1px solid #ddd; background: rgba(255,255,255,0.1); color: white;">${team2WinRate}%</td>
    `;
    tbody.appendChild(row2);
    
    // Empty row for spacing
    const spacerRow = document.createElement("tr");
    spacerRow.innerHTML = '<td colspan="7" style="padding: 4px; background: transparent;"></td>';
    tbody.appendChild(spacerRow);
  });
  table.appendChild(tbody);
  
  overallHeadToHeadSection.innerHTML = "";
  overallHeadToHeadSection.appendChild(table);
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

// Load Overall Head-to-Head Data from All Seasons
function loadOverallHeadToHeadData() {
  console.log("Loading overall head-to-head data from all seasons...");
  overallHeadToHeadData = {};
  
  onValue(ref(db, "leagues"), (snapshot) => {
    let totalMatches = 0;
    let seasonsWithMatches = 0;
    
    snapshot.forEach((leagueSnapshot) => {
      const leagueName = leagueSnapshot.key;
      const matches = leagueSnapshot.child("matches");
      
      if (matches.exists()) {
        let seasonMatches = 0;
        matches.forEach((matchSnapshot) => {
          const match = matchSnapshot.val();
          updateOverallHeadToHead(match.team1, match.team2, match.team1Score, match.team2Score);
          seasonMatches++;
          totalMatches++;
        });
        if (seasonMatches > 0) {
          seasonsWithMatches++;
          console.log(`Season ${leagueName}: ${seasonMatches} matches`);
        }
      }
    });
    
    console.log(`Overall head-to-head data loaded: ${totalMatches} total matches from ${seasonsWithMatches} seasons`);
    console.log("Overall head-to-head data:", overallHeadToHeadData);
    renderOverallHeadToHeadTable();
  }, { onlyOnce: false }); // Keep listening for changes
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
    headToHeadData = {}; // Only clear current season head-to-head data
    const matches = [];

    snapshot.forEach((childSnapshot) => {
      const match = childSnapshot.val();
      matches.push(match);
      updateTeamStats(match.team1, match.team1Score, match.team2Score);
      updateTeamStats(match.team2, match.team2Score, match.team1Score);
      updateHeadToHead(match.team1, match.team2, match.team1Score, match.team2Score);
      // Don't update overall head-to-head here - it should be loaded separately
    });

    renderTable();
    renderMatchHistory(matches);
    renderHeadToHeadTable();
    // Don't render overall head-to-head here - it should be loaded separately
  });
}

// Display Current Season Winner
function displayCurrentSeasonWinner() {
  if (!currentLeague) return;
  
  onValue(ref(db, `leagues/${currentLeague}`), (snapshot) => {
    const leagueData = snapshot.val();
    if (leagueData && leagueData.winner) {
      const winnerSection = document.getElementById("current-winner");
      if (winnerSection) {
        winnerSection.innerHTML = `
          <div style="background: rgba(255, 255, 255, 0.2); padding: 10px; border-radius: 8px; margin: 10px 0;">
            <h3 style="color: white; margin: 0;">🏆 ${currentLeague} Winner: ${leagueData.winner}</h3>
            ${leagueData.winnerPoints ? `<p style="color: white; margin: 5px 0 0 0;">Points: ${leagueData.winnerPoints}</p>` : ''}
          </div>
        `;
      }
    }
  }, { onlyOnce: true });
}

// Initialize Application
function init() {
  fetchAndRenderMatches();
  displayCurrentSeasonWinner();
  loadOverallHeadToHeadData();

  // Add mobile-specific improvements
  addMobileImprovements();

  const matchHistoryButton = document.getElementById("match-history-btn");
  matchHistoryButton.addEventListener("click", () => {
    const matchHistorySection = document.getElementById("match-history");
    matchHistorySection.style.display =
      matchHistorySection.style.display === "none" ||
      !matchHistorySection.style.display
        ? "block"
        : "none";
  });

  const headToHeadButton = document.getElementById("head-to-head-btn");
  headToHeadButton.addEventListener("click", () => {
    const headToHeadSection = document.getElementById("head-to-head-section");
    headToHeadSection.style.display =
      headToHeadSection.style.display === "none" ||
      !headToHeadSection.style.display
        ? "block"
        : "none";
  });

  const overallHeadToHeadButton = document.getElementById("overall-head-to-head-btn");
  overallHeadToHeadButton.addEventListener("click", () => {
    const overallHeadToHeadSection = document.getElementById("overall-head-to-head-section");
    const isHidden = overallHeadToHeadSection.style.display === "none" || !overallHeadToHeadSection.style.display;
    
    if (isHidden) {
      // Refresh the overall head-to-head data when showing the section
      loadOverallHeadToHeadData();
    }
    
    overallHeadToHeadSection.style.display = isHidden ? "block" : "none";
  });
}

// Add mobile-specific improvements
function addMobileImprovements() {
  // Prevent zoom on double tap for iOS
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Add touch feedback to buttons
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('touchstart', function() {
      this.style.transform = 'scale(0.95)';
    });
    button.addEventListener('touchend', function() {
      this.style.transform = 'scale(1)';
    });
  });

  // Improve table scrolling on mobile
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    table.addEventListener('touchstart', function(e) {
      this.style.overflowX = 'auto';
    });
  });

  // Add mobile-friendly focus styles
  const inputs = document.querySelectorAll('input, select');
  inputs.forEach(input => {
    input.addEventListener('focus', function() {
      this.style.transform = 'scale(1.02)';
    });
    input.addEventListener('blur', function() {
      this.style.transform = 'scale(1)';
    });
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
