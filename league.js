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

  // Condition for same teams
  if (team1 === team2) {
    alert("Please select different teams.");
    return;
  }

  // Update stats for both teams
  updateTeamStats(team1, team1Score, team2Score);
  updateTeamStats(team2, team2Score, team1Score);

  // Render the updated table with animation
  renderTable();

  // Clear input fields with a slight delay to show animations
  setTimeout(() => {
    document.getElementById("team1").value = "";
    document.getElementById("team2").value = "";
    document.getElementById("team1-score").value = "";
    document.getElementById("team2-score").value = "";
  }, 500);
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

  let lastRank = sortedTeams.length - 1;

  for (const [index, team] of sortedTeams.entries()) {
    const stats = tableData[team];
    const row = document.createElement("tr");

    const goalDifference = stats.goalsFor - stats.goalsAgainst;
    const goalsAgainstColor =
      stats.goalsAgainst < 0 ? 'style="color: red;"' : "";
    const goalDifferenceColor = goalDifference < 0 ? 'style="color: red;"' : "";

    row.innerHTML = `
      <td>${team}</td>
      <td>${stats.played}</td>
      <td>${stats.won}</td>
      <td>${stats.drawn}</td>
      <td>${stats.lost}</td>
      <td ${goalsAgainstColor}>${stats.goalsFor}</td>
      <td ${goalsAgainstColor}>${stats.goalsAgainst}</td>
      <td ${goalDifferenceColor}>${goalDifference}</td>
      <td>${stats.points}</td>
      <td><button class="delete-button" onclick="deleteMatch('${team}')">Delete</button></td>
    `;

    // Add red color to the last ranked team
    if (index === lastRank) {
      row.style.backgroundColor = "red";
    }

    // Add animation class for table rows
    row.classList.add("row-animation");

    tbody.appendChild(row);
  }
}

function deleteMatch(team) {
  delete tableData[team];
  renderTable();
}

function setupAudio() {
  const audio = document.getElementById("background-audio");
  const muteButton = document.getElementById("mute-button");

  audio.currentTime = 0; // Start from the beginning
  console.log("Audio Playing");
  //audio.play(); // Play audio
  console.log("Audio Stopped");

  // Set default volume and loop audio
  audio.volume = 0.3;
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
