const tableData = {};

function addMatch() {
  const team1 = document.getElementById("team1").value.trim().toLowerCase();
  const team2 = document.getElementById("team2").value.trim().toLowerCase();
  const team1Score = parseInt(document.getElementById("team1-score").value);
  const team2Score = parseInt(document.getElementById("team2-score").value);

  if (!team1 || !team2 || isNaN(team1Score) || isNaN(team2Score)) {
    alert("Please fill out all fields correctly.");
    return;
  }

  // Update stats for both teams
  updateTeamStats(team1, team1Score, team2Score);
  updateTeamStats(team2, team2Score, team1Score);

  // Render the updated table
  renderTable();

  // Clear input fields
  document.getElementById("team1").value = "";
  document.getElementById("team2").value = "";
  document.getElementById("team1-score").value = "";
  document.getElementById("team2-score").value = "";
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

function renderTable() {
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  const sortedTeams = Object.keys(tableData).sort((a, b) => {
    if (tableData[b].points === tableData[a].points) {
      return tableData[b].goalsFor - tableData[a].goalsFor;
    }
    return tableData[b].points - tableData[a].points;
  });

  for (const team of sortedTeams) {
    const stats = tableData[team];
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${team}</td>
      <td>${stats.played}</td>
      <td>${stats.won}</td>
      <td>${stats.drawn}</td>
      <td>${stats.lost}</td>
      <td>${stats.goalsFor}</td>
      <td>${stats.goalsAgainst}</td>
      <td>${stats.goalsFor - stats.goalsAgainst}</td>
      <td>${stats.points}</td>
    `;

    tbody.appendChild(row);
  }
}

function setupAudio() {
  const audio = document.getElementById("background-audio");
  const muteButton = document.getElementById("mute-button");

  audio.currentTime = 0; // Start from the beginning
  console.log("Audio Playing");
  //audio.play(); // Play audio
  console.log("Audio Stopped");

  // Set default volume and loop audio
  audio.volume = 0.5;
  audio.loop = true;

  // Add event listener for mute/unmute
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

// Initialize the page
function init() {
  renderTable();
  setupAudio();
}

// Run the init function when the page loads
document.addEventListener("DOMContentLoaded", init);
