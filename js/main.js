//
// variables
//

const body = document.body;
const ogTitle = document.querySelector("meta[property='og:title']");
const ogImage = document.querySelector("meta[property='og:image']");
const main = document.getElementById("main");
const contentWrapper = document.getElementById("crowd-content-wrapper");
const statusHeader = document.getElementById("crowd-status");
const summaryText = document.getElementById("crowd-summary");
const aboutIcon = document.getElementById("about-icon");
const downloadIcon = document.getElementById("download-icon");
const closeIcon = document.getElementById("close-icon");
const overlay = document.getElementById("overlay");
const modal = document.getElementById("modal");
const modalCloseIcon = document.getElementById("modal-close-icon");
const aboutTitle = document.querySelector("#about > h2");
const aboutDescription = document.querySelector("#about > p");
const fineprint = document.getElementById("fineprint");
const endpoint = "https://o8ulxwqrt9.execute-api.us-west-1.amazonaws.com/dev/pericos";
const debugMode = true;
const emojiMap = {
    "Oops.": ["😳", "😅", "🤦", "🤯"],
    "Bummer.": ["🦗", "😢", "😭", "😞"],
    "Sick!": ["🙌", "🥳", "🎉", "💯"],
    "All good!": ["🙌", "👏", "👌", "🤙"],
    "Nice.": ["😙", "😌", "👌", "🤙"],
    "Welp,": ["😬", "😰", "😑", "😅"],
    "Yikes.": ["🙅", "🤢", "👎", "😬"],
    "Don't go.": ["⚰", "😵", "🤬", "🙅"]
};
let appNeedsRefresh = false;

//
// functions
//

function buildMessage(score) {
    const message = {};
    // build a message based on score
    if (score < 10) {
        message.status = "empty";
        message.reaction = "Sick!";
    } else if (score >= 10 && score < 30) {
        message.status = "not crowded";
        message.reaction = "All good!";
    } else if (score >= 30 && score < 40) {
        message.status = "not too crowded";
        message.reaction = "Nice.";
    } else if (score >= 40 && score < 60) {
        message.status = "kinda crowded";
        message.reaction = "Welp,";
    } else if (score >= 60 && score < 80) {
        message.status = "crowded";
        message.reaction = "Yikes.";
    } else if (score >= 80 && score <= 100) {
        message.status = "mobbed";
        message.reaction = "Don't go.";
    }
    message.summary = `${message.reaction} Los Pericos is <nobr>${message.status}</nobr> right&nbsp;now.`;
    return message;
}

function calculateScore(crowdData) {
    const currentPopularity = crowdData.current_popularity / 100;
    const historicalPopularity = getHistoricalData(crowdData) / 100;
    // weight the currentPopularity more
    // than the historicalPopularity
    return Math.round(((currentPopularity * 0.7) + (historicalPopularity * 0.3)) * 100);
}

function crowdDataIsValid(crowdData) {
    // if there is no current_popularity
    // either Pericos is closed or
    // an API error occurred
    if (typeof crowdData.current_popularity === "undefined") {
        if (pericosIsClosed(crowdData)) {
            displayClosedMessage()
        } else {
            displayErrorMessage();
        }
        return false;
    }
    return true;
}

function displayClosedMessage() {
    const message = {};
    message.reaction = "Bummer.";
    message.summary = `${message.reaction} Los Pericos is <b>closed</b> right&nbsp;now.`;
    updateView(message);
}

function displayDebugInfo(crowdData, score) {
    const debugFigures = {
        "current popularity": crowdData.current_popularity,
        "historical popularity": getHistoricalData(crowdData),
        "crowd score": score
    };
    for (let figure in debugFigures) {
        const element = document.createElement("span");
        element.classList.add("debug-info");
        element.innerHTML = `${figure}: ${debugFigures[figure]}`;
        fineprint.appendChild(element);
    }
}

function displayErrorMessage() {
    const message = {};
    message.reaction = "Oops.";
    message.summary = `${reaction} An <b>error</b> occurred. Please try again later.`;
    updateView(message);
}

function initializeApp() {
    // get crowd data from API endpoint
    fetch(endpoint, {
        method: "GET",
        mode: "cors",
        cache: "no-store"
    }).then((response) => {
        return response.json();
    }).then((crowdData) => {
        processCrowdData(crowdData);
    }).catch(() => {
        displayErrorMessage();
    });
}

function getHistoricalData(crowdData) {
    const time = new Date();
    // convert from Sunday as 0-index to Monday as 0-index
    const day = time.getDay() > 0 ? time.getDay() - 1 : 6;
    return crowdData.populartimes[day].data[time.getHours()];
}

function hideElement(element) {
    element.classList.add("hidden");
    element.classList.remove("animated", "quick", "fadeInUp");
}

function isAndroidDevice() {
    return navigator.userAgent.includes("Android");
}

function isAppleDevice() {
    return ["iPhone", "iPad", "iPod"].includes(navigator.platform);
}

function isInStandaloneMode() {
    return (window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches);
}

function pericosIsClosed(crowdData) {
    // return true if historical popularity is 0
    return !getHistoricalData(crowdData);
}

function processCrowdData(crowdData) {
    if (crowdDataIsValid(crowdData)) {
        const score = calculateScore(crowdData);
        const message = buildMessage(score);
        if (debugMode) displayDebugInfo(crowdData, score);
        updateOgData(message);
        updateView(message);
    }
}

function queueRefresh() {
    if (appNeedsRefresh) {
        window.location.reload(true);
        return;
    } else if (document.hidden) {
        // empty status and summary to
        // prevent a flash of stale content
        statusHeader.innerHTML = "";
        summaryText.innerHTML = "";
        appNeedsRefresh = true;
    }
}

function shouldDisplayDownloadIcon() {
    if (!isInStandaloneMode()) {
        return (isAppleDevice() || isAndroidDevice());
    }
    return false;
}

function showElement(element, animate=true) {
    element.classList.remove("hidden");
    if (animate) {
        element.classList.add("animated", "quick", "fadeInUp");
    }
}

function toggleMenu() {
    if (body.classList.contains("menu-open")) {
        body.classList.remove("menu-open");
        hideElement(closeIcon);
        hideElement(aboutTitle);
        hideElement(aboutDescription);
        main.removeEventListener("click", toggleMenu);
    } else {
        body.classList.add("menu-open");
        showElement(closeIcon);
        showElement(aboutTitle);
        setTimeout(() => {
            showElement(aboutDescription);
        }, 100);
        main.addEventListener("click", toggleMenu);
    }
}

function toggleModal() {
    if (modal.classList.contains("hidden")) {
        showElement(overlay, false);
        showElement(modal);
    } else {
        hideElement(overlay);
        hideElement(modal);
    }
}

function updateOgData(message) {
    // replace spaces with underscores
    const imgPath = `./img/og_${message.status.replace(/\s+/g, "_")}.png`;
    ogTitle.setAttribute("content", message.summary);
    ogImage.setAttribute("content", imgPath);
}

function updateView(message) {
    const emoji = emojiMap[message.reaction][Math.floor(Math.random() * 4)];
    statusHeader.innerHTML = emoji;
    showElement(statusHeader);
    setTimeout(() => {
        summaryText.innerHTML = message.summary;
        showElement(summaryText);
    }, 100);
}

//
// download behavior
//

if (shouldDisplayDownloadIcon()) {
    showElement(downloadIcon, false);
}

//
// standalone behavior
//

if (isInStandaloneMode()) {
    // queue an app refresh when the
    // app is closed or is in the background
    document.addEventListener("visibilitychange", queueRefresh, false);
}

//
// event listeners
//

// reload page by tapping any of the content
contentWrapper.addEventListener("click", () => {
    window.location.reload(true);
});

// open menu when about icon is clicked
aboutIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
});

// display modal when download icon is clicked
downloadIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleModal();
});

// close modal when modal close icon is clicked
modalCloseIcon.addEventListener("click", toggleModal);

// close modal when overlay icon is clicked
overlay.addEventListener("click", toggleModal);

// close menu when close icon is clicked
closeIcon.addEventListener("click", toggleMenu);

// close menu when esc key is clicked
window.addEventListener("keyup", (e) => {
    if (e.keyCode === 27) {
        toggleMenu();
    }
}, false);

//
// initialize app
//

initializeApp();
