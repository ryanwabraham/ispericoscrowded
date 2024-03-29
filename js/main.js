//
// variables
//

const body = document.body;
const ogTitle = document.querySelector("meta[property='og:title']");
const ogDescription = document.querySelector("meta[property='og:description']");
const main = document.getElementById("main");
const contentWrapper = document.getElementById("crowd-content-wrapper");
const statusHeader = document.getElementById("crowd-status");
const summaryText = document.getElementById("crowd-summary");
const shareButton = document.getElementById("share-button");
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
    "error": ["😳", "😅", "🤦", "🤯"],
    "closed": ["🦗", "😢", "😭", "😞"],
    "empty": ["🙌", "🥳", "🎉", "💯"],
    "not crowded": ["🙌", "💃", "👌", "🤙"],
    "not too crowded": ["😙", "😌", "👌", "🤙"],
    "a little crowded": ["😐", "😒", "😑", "🙈"],
    "pretty crowded": ["😥", "😖", "😬", "😞"],
    "crowded": ["🙅", "🤢", "👎", "😬"],
    "mobbed": ["⚰", "😵", "🤬", "🙅"]
};
let appNeedsRefresh = false;
let crowdScore = 0;

//
// functions
//

function buildMessage(score) {
    const message = {};
    // build a message based on score
    if (score < 20) {
        message.status = "empty";
        message.reaction = "Sick!";
    } else if (score >= 20 && score < 30) {
        message.status = "not crowded";
        message.reaction = "All good!";
    } else if (score >= 30 && score < 45) {
        message.status = "not too crowded";
        message.reaction = "Nice.";
    } else if (score >= 45 && score < 60) {
        message.status = "a little crowded";
        message.reaction = "Welp,";
    } else if (score >= 60 && score < 75) {
        message.status = "pretty crowded";
        message.reaction = "Bummer.";
    } else if (score >= 75 && score < 90) {
        message.status = "crowded";
        message.reaction = "Yikes.";
    } else if (score >= 90 && score <= 100) {
        message.status = "mobbed";
        message.reaction = "Don't go.";
    }
    message.metaDescription = `${getReactionEmoji(message.status)} ${message.reaction} Los Pericos is ${message.status} right now.`;
    message.summary = `${message.reaction} Los Pericos is <nobr>${message.status}</nobr> right&nbsp;now.`;
    return message;
}

function calculateScore(crowdData) {
    // if there is no current_popularity
    // use the historical value
    if (typeof crowdData.current_popularity === "undefined") {
        crowdData.current_popularity = getHistoricalData(crowdData);
    }
    const currentPopularity = crowdData.current_popularity / 100;
    const historicalPopularity = getHistoricalData(crowdData) / 100;
    const weightedScore = Math.round(((currentPopularity * 0.8) + (historicalPopularity * 0.2)) * 100);
    // if the currentPopularity is lower
    // than the historicalPopularity,
    // use a weighted score because there
    // is less data to work with
    crowdScore = currentPopularity < historicalPopularity ? weightedScore : Math.round(currentPopularity * 100);
    return crowdScore;
}

function displayClosedMessage() {
    const message = {};
    message.status = "closed";
    message.reaction = "Bummer.";
    message.summary = `${message.reaction} Los Pericos is <b>${message.status}</b> right&nbsp;now.`;
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

function displayDiscontinuedMessage() {
    const message = {};
    message.status = "closed";
    message.summary = "Sorry all. This app has been discontinued.";
    updateView(message);
}

function displayErrorMessage() {
    const message = {};
    message.status = "error";
    message.reaction = "Oops.";
    message.summary = `${message.reaction} An <b>${message.status}</b> occurred. Please try again later.`;
    updateView(message);
}

function displayShareButton() {
    // show share button if
    // native sharing is supported
    if (typeof navigator.share !== "undefined") {
        if (crowdScore >= 60) {
            updateShareButtonText("Warn a Friend!");
        }
        setTimeout(() => {
            showElement(shareButton);
        }, 200);
    }
}

function getReactionEmoji(reaction) {
    return emojiMap[reaction][Math.floor(Math.random() * 4)];
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
    if (pericosIsClosed(crowdData)) {
        displayClosedMessage();
    } else {
        const score = calculateScore(crowdData);
        const message = buildMessage(score);
        if (debugMode) displayDebugInfo(crowdData, score);
        updateMetaData(message);
        updateView(message);
        displayShareButton();
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

function updateMetaData(message) {
    ogDescription.setAttribute("content", message.metaDescription);
}

function updateShareButtonText(newText) {
    shareButton.innerHTML = newText;
}

function updateView(message) {
    const emoji = getReactionEmoji(message.status);
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

// open share panel when share button is clicked
shareButton.addEventListener("click", (e) => {
    let shareUrl = document.querySelector("link[rel=canonical]").href;
    // remove trailing slash and add utm source
    shareUrl = shareUrl.replace(/\/$/, "") + "?utm_source=share";
    navigator.share({
        title: ogTitle.getAttribute("content"),
        text: ogDescription.getAttribute("content"),
        url: shareUrl
    }).then(() => {
        // on completion change the button
        // text to an appreciative message
        const originalButtonText = shareButton.innerHTML;
        updateShareButtonText("You rock! 🎸");
        setTimeout(() => {
            updateShareButtonText(originalButtonText);
        }, 3000);
    });
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
