const body = document.body;
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
const endpoint = "https://o8ulxwqrt9.execute-api.us-west-1.amazonaws.com/dev/pericos";
const emojiMap = {
    "Oops.": ["😳", "😅", "🤦", "🤯"],
    "Bummer.": ["🦗", "😢", "😭", "😞"],
    "Sick!": ["🙌", "🥳", "🎉", "💯"],
    "All good!": ["🙌", "👏", "👌", "🤙"],
    "...": ["😬", "😕", "😶", "🙊"],
    "Yikes.": ["🙅", "🤢", "👎", "😬"],
    "Don't go.": ["⚰", "😵", "🤬", "🙅"]
};
let appNeedsRefresh = false;

//
// initialize app
//

getCrowdData();

//
// functions
//

function determineCrowdLevel(crowdData) {
    let status = "";
    let reaction = "";
    let summary = "";
    // validate data, display error message
    if (typeof crowdData.current_popularity === "undefined") {
        // check if Pericos is closed
        if (pericosIsClosed(crowdData)) {
            reaction = "Bummer.";
            summary = `${reaction} Los Pericos is <b>closed</b> right&nbsp;now.`;
            updateView(summary, reaction);
        } else {
            displayErrorMessage();
        }
        return;
    }
    // build messaging based on crowd level
    const popularity = crowdData.current_popularity;
    if (popularity < 20) {
        status = "empty";
        reaction = "Sick!";
    } else if (popularity >= 20 && popularity < 40) {
        status = "not crowded";
        reaction = "All good!";
    } else if (popularity >= 40 && popularity < 60) {
        status = "pretty crowded";
        reaction = "...";
    } else if (popularity >= 60 && popularity < 80) {
        status = "crowded";
        reaction = "Yikes.";
    } else if (popularity >= 80 && popularity <= 100) {
        status = "mobbed";
        reaction = "Don't go.";
    }
    summary = `${reaction} Los Pericos is <nobr>${status}</nobr> right&nbsp;now.`;
    updateView(summary, reaction);
}

function displayErrorMessage() {
    const reaction = "Oops.";
    const summary = `${reaction} An <b>error</b> occurred. Please try again later.`;
    updateView(summary, reaction);
}

function getCrowdData() {
    fetch(endpoint, {
        method: "GET",
        mode: "cors",
        cache: "no-store"
    }).then((response) => {
        return response.json();
    }).then((crowdData) => {
        determineCrowdLevel(crowdData);
    }).catch(() => {
        displayErrorMessage();
    });
}

function hideElement(element) {
    element.classList.add("hidden");
    element.classList.remove("animated", "quick", "fadeInUp");
}

function isAndroidDevice() {
    return navigator.userAgent.includes("Android");
}

function isAppleDevice() {
    return ['iPhone', 'iPad', 'iPod'].includes(navigator.platform);
}

function isInStandaloneMode() {
    return (window.navigator.standalone == true || window.matchMedia("(display-mode: standalone)").matches);
}

function pericosIsClosed(crowdData) {
    const time = new Date();
    // convert from Sunday as 0-index to Monday as 0-index
    const day = time.getDay() > 0 ? time.getDay() - 1 : 6;
    // return true if popularity is 0
    return !crowdData.populartimes[day].data[time.getHours()];
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
        setTimeout(function() {
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

function updateView(summary, reaction) {
    const emoji = emojiMap[reaction][Math.floor(Math.random() * 4)];
    statusHeader.innerHTML = emoji;
    showElement(statusHeader);
    setTimeout(function() {
        summaryText.innerHTML = summary;
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
    document.addEventListener('visibilitychange', queueRefresh, false);
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
window.addEventListener("keyup", function(e){
    if (e.keyCode == 27) {
        toggleMenu();
    }
}, false);
