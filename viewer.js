// This page only reads a match. It never saves or changes a score.
async function loadScoreboard() {
    const message = document.getElementById("viewer-message");
    const scoreboard = document.getElementById("scoreboard");

    try {
        const match = await getMatch();
        if (match === null) {
            message.textContent = "No match has been created yet. Ask the operator to save a match, then refresh this page.";
            return;
        }

        // Use textContent so names are displayed as text, never as HTML.
        document.getElementById("batting-team").textContent = match.battingTeam;
        document.getElementById("opposition-team").textContent = match.oppositionTeam;
        document.getElementById("total-runs").textContent = match.runs;
        document.getElementById("wickets").textContent = match.wickets;
        document.getElementById("extras").textContent = match.extras;
        document.getElementById("batsman").textContent = match.batsman;
        document.getElementById("bowler").textContent = match.bowler;
        document.getElementById("match-status").textContent = match.status;

        // Example: 15 legal balls = 2 completed overs and 3 remaining balls.
        const completedOvers = Math.floor(match.legalBalls / 6);
        const remainingBalls = match.legalBalls % 6;
        document.getElementById("overs").textContent = completedOvers + "." + remainingBalls;

        const recentDeliveries = document.getElementById("recent-deliveries");
        if (match.recentDeliveries.length === 0) {
            recentDeliveries.textContent = "No deliveries yet";
        } else {
            recentDeliveries.textContent = match.recentDeliveries.join("  ");
        }

        message.hidden = true;
        scoreboard.hidden = false;
    } catch (error) {
        scoreboard.hidden = true;
        message.classList.add("error");
        message.textContent = "Could not load the saved match. Allow browser storage or ask the operator to reset damaged match data, then refresh.";
    }
}

// Manual browser refresh is enough; there is no polling or live connection.
loadScoreboard();
