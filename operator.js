// storage.js loads first, so saveMatch() and getMatch() are available here.
let currentMatch = null;
let isBusy = true;
let hasStorageError = false;

const matchForm = document.getElementById("match-form");
const scoringButtons = document.querySelectorAll("[data-delivery]");
const endInningsButton = document.getElementById("end-innings");
const resetMatchButton = document.getElementById("reset-match");

function showMessage(text, isError = false) {
    const message = document.getElementById("operator-message");
    message.textContent = text;
    message.classList.toggle("error", isError);
}

function updateControls() {
    let inningsEnded = false;
    if (currentMatch !== null) {
        inningsEnded = currentMatch.status === "Innings ended";
    }

    const scoringLocked = isBusy || hasStorageError || inningsEnded;
    for (const button of scoringButtons) {
        button.disabled = scoringLocked;
    }
    for (const input of matchForm.querySelectorAll("input")) {
        input.disabled = scoringLocked;
    }
    document.getElementById("save-details").disabled = scoringLocked;
    endInningsButton.disabled = scoringLocked || currentMatch === null;
    // Reset remains available after a storage error or completed innings.
    resetMatchButton.disabled = isBusy;
}

function displayOperatorScore() {
    let runs = 0;
    let wickets = 0;
    let legalBalls = 0;
    let extras = 0;
    let status = "Not started";
    let teams = "No match created";

    if (currentMatch !== null) {
        runs = currentMatch.runs;
        wickets = currentMatch.wickets;
        legalBalls = currentMatch.legalBalls;
        extras = currentMatch.extras;
        status = currentMatch.status;
        teams = currentMatch.battingTeam + " vs " + currentMatch.oppositionTeam;
    }

    // Overs are a display notation, not an ordinary decimal number.
    const completedOvers = Math.floor(legalBalls / 6);
    const remainingBalls = legalBalls % 6;
    document.getElementById("total-runs").textContent = runs;
    document.getElementById("wickets").textContent = wickets;
    document.getElementById("overs").textContent = completedOvers + "." + remainingBalls;
    document.getElementById("extras").textContent = extras;
    document.getElementById("match-status").textContent = status;
    document.getElementById("operator-teams").textContent = teams;
}

function fillMatchForm() {
    if (currentMatch === null) {
        matchForm.reset();
        return;
    }
    document.getElementById("batting-team").value = currentMatch.battingTeam;
    document.getElementById("opposition-team").value = currentMatch.oppositionTeam;
    document.getElementById("batsman").value = currentMatch.batsman;
    document.getElementById("bowler").value = currentMatch.bowler;
}

function readMatchFromForm() {
    if (!matchForm.reportValidity()) {
        return null;
    }

    const battingTeam = document.getElementById("batting-team").value.trim();
    const oppositionTeam = document.getElementById("opposition-team").value.trim();
    const batsman = document.getElementById("batsman").value.trim();
    const bowler = document.getElementById("bowler").value.trim();

    if (!battingTeam || !oppositionTeam || !batsman || !bowler) {
        showMessage("Please enter all four names. Spaces alone are not valid.", true);
        return null;
    }
    if (battingTeam.toLowerCase() === oppositionTeam.toLowerCase()) {
        showMessage("The batting team and opposition must have different names.", true);
        return null;
    }

    // A separate object keeps the displayed score unchanged if saving fails.
    const match = {
        battingTeam: battingTeam,
        oppositionTeam: oppositionTeam,
        batsman: batsman,
        bowler: bowler,
        runs: 0,
        wickets: 0,
        legalBalls: 0,
        extras: 0,
        recentDeliveries: [],
        status: "In progress"
    };

    if (currentMatch !== null) {
        match.runs = currentMatch.runs;
        match.wickets = currentMatch.wickets;
        match.legalBalls = currentMatch.legalBalls;
        match.extras = currentMatch.extras;
        match.recentDeliveries = currentMatch.recentDeliveries.slice();
        match.status = currentMatch.status;
    }
    return match;
}

// Scoring only changes the supplied match. It does not access storage or HTML.
function calculateScore(match, delivery) {
    if (match.status !== "In progress" || match.wickets >= 10) {
        return;
    }

    if (delivery === "Wd" || delivery === "Nb") {
        match.runs += 1;
        match.extras += 1;
    } else if (delivery === "W") {
        match.wickets += 1;
        match.legalBalls += 1;
        if (match.wickets === 10) {
            match.status = "Innings ended";
        }
    } else {
        const allowedRuns = ["0", "1", "2", "3", "4", "6"];
        if (!allowedRuns.includes(delivery)) {
            return;
        }
        match.runs += Number(delivery);
        match.legalBalls += 1;
    }

    match.recentDeliveries.push(delivery);
    if (match.recentDeliveries.length > 12) {
        match.recentDeliveries.shift();
    }
}

async function persistMatch(match, successMessage) {
    isBusy = true;
    updateControls();
    try {
        await saveMatch(match);
        currentMatch = match;
        displayOperatorScore();
        fillMatchForm();
        showMessage(successMessage);
    } catch (error) {
        showMessage("Could not save. The displayed score has not changed. Allow browser storage and try again.", true);
    } finally {
        isBusy = false;
        updateControls();
    }
}

async function recordDelivery(delivery) {
    if (isBusy || hasStorageError) {
        return;
    }
    if (currentMatch !== null && currentMatch.status === "Innings ended") {
        return;
    }
    const match = readMatchFromForm();
    if (match === null) {
        return;
    }
    calculateScore(match, delivery);
    let message = "Delivery saved. Refresh the viewer to see the latest score.";
    if (match.wickets === 10) {
        message = "All out! The innings has ended and the final score is saved.";
    }
    await persistMatch(match, message);
}

matchForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (isBusy || hasStorageError) {
        return;
    }
    if (currentMatch !== null && currentMatch.status === "Innings ended") {
        return;
    }
    const match = readMatchFromForm();
    if (match !== null) {
        await persistMatch(match, "Match information saved. You can now record deliveries.");
    }
});

for (const button of scoringButtons) {
    button.addEventListener("click", async function () {
        await recordDelivery(button.dataset.delivery);
    });
}

endInningsButton.addEventListener("click", async function () {
    if (isBusy || hasStorageError || currentMatch === null || currentMatch.status === "Innings ended") {
        return;
    }
    if (!window.confirm("End this innings? Further scoring will be disabled until you reset the match.")) {
        return;
    }
    const match = readMatchFromForm();
    if (match !== null) {
        match.status = "Innings ended";
        await persistMatch(match, "Innings ended. The final score has been saved.");
    }
});

resetMatchButton.addEventListener("click", async function () {
    if (isBusy) {
        return;
    }
    if (!window.confirm("Delete the saved match and clear all names and scores? This cannot be undone.")) {
        return;
    }
    isBusy = true;
    updateControls();
    try {
        await saveMatch(null);
        currentMatch = null;
        hasStorageError = false;
        matchForm.reset();
        displayOperatorScore();
        showMessage("Previous match cleared. Enter new match information to start again.");
    } catch (error) {
        showMessage("Could not reset. Allow browser storage and try again. Nothing has been cleared.", true);
    } finally {
        isBusy = false;
        updateControls();
    }
});

async function loadOperator() {
    updateControls();
    try {
        currentMatch = await getMatch();
        fillMatchForm();
        displayOperatorScore();
        if (currentMatch === null) {
            showMessage("Enter match information to start a new match.");
        } else {
            showMessage("Saved match loaded. Refresh the viewer after making changes.");
        }
    } catch (error) {
        hasStorageError = true;
        showMessage("Could not load the match. Allow browser storage or reset damaged saved data.", true);
    } finally {
        isBusy = false;
        updateControls();
    }
}

loadOperator();
