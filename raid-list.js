function getRaidLists() {
	var raidLists = document.getElements("#raidList .listEntry");
	var raidListsInfo = [];

	for (var i = 0; i < raidLists.length; i++) {
		var title = raidLists[i].getElements(".listTitleText")[0].innerText.trim();
		var id = raidLists[i].getElements("input.markAll")[0].id;
		var numberId = id.match(/[0-9]+/)[0];
		var submitId = raidLists[i].getElements("button[type=submit]")[0].id;

		raidListsInfo.push({
			title: title, id: numberId
		});
	}

	return raidListsInfo;
}

function generateSimplifiedRaidList(raidListsInfo) {
	var simpleRaidLists = [];

	raidListsInfo.forEach(function(raidList) {
		simpleRaidLists.push(`<label><input type="checkbox" value="${raidList.id}"> ${raidList.title}</label><br>`);
	});

	return simpleRaidLists.join("") + "<br>" + generateSubmitButton();
}

function generateSubmitButton() {
	return `<input type="submit" id="tbc-submit-simple-raid-list" value="Odeslat">`;
}

function setSimpleRaidList(html) {
	var el = document.createElement("div");
	var raidList = document.getElementById("raidList");
	var firstChild = raidList.children[0];
	el.innerHTML = html;
	el.style.padding = "10px 0";
	el.id = "tbc-simple-raid-list";
	raidList.insertBefore(el, firstChild);

	initListeners();
}

function submitSimpleRaidList() {
	updateScheduledRaidLists(getSelectedSimpleRaidLists());
	sendSimpleRaidList();
}

function getSelectedSimpleRaidLists() {
	var selectedInputs = document.getElementById("tbc-simple-raid-list").getElements("input:checked");
	var raidListIds = [];

	for (var i = 0; i < selectedInputs.length; i++) {
		raidListIds.push(selectedInputs[i].value);
	}

	return raidListIds;
}

function updateScheduledRaidLists(raidListIds) {
	localStorage.setItem("tbc-scheduled-raid-lists", JSON.stringify({
		raidListIds: raidListIds,
		timestamp: Date.now()
	}));
}

function getNextRaidList() {
	var scheduledRaidLists = getSchedulesRaidLists();

	if (scheduledRaidLists && scheduledRaidLists.length > 0) {
		return scheduledRaidLists[0];
	}
}

function initListeners() {
	document.getElementById("tbc-submit-simple-raid-list").onclick = submitSimpleRaidList;
}

function sendSimpleRaidList() {
	var scheduledRaidList = getNextRaidList();

	if (scheduledRaidList) {
		markAllVillagesInRaidList(scheduledRaidList);
		sendSingleRaidList(scheduledRaidList);
	}
}

function sendSingleRaidList(raidListId) {
	removeRaidList(raidListId);
	var selector = `#list${raidListId} button[type=submit]`;
	document.getElements(selector)[0].click();
}

function removeRaidList(raidListId) {
	var scheduledRaidLists = getSchedulesRaidLists();
	var filteredRaidLists = scheduledRaidLists.filter(x => x != raidListId);
	console.log(scheduledRaidLists, filteredRaidLists, raidListId);
	updateScheduledRaidLists(filteredRaidLists);
}

function getSchedulesRaidLists() {
	try {
		var data = JSON.parse(localStorage.getItem("tbc-scheduled-raid-lists"));

		if (isNaN(data.timestamp)) {
			return [];
		}

		if (Date.now() - data.timestamp > 5000) {
			updateScheduledRaidLists([]);
			return [];
		} else {
			return data.raidListIds;
		}

	} catch(err) {
		console.log(err.message);
		return [];
	}
}

function markAllVillagesInRaidList(raidListId) {
	Travian.Game.RaidList.markAllSlotsOfAListForRaid(parseInt(raidListId), true);
}

function shouldSendNextRaidList() {
	return getSchedulesRaidLists().length > 0;
}

if (document.getElementById("raidList")) {
	if (shouldSendNextRaidList()) {
		setTimeout(sendSimpleRaidList, Math.random() * 750);
	} else {
		var raidLists = getRaidLists();
		var simpleRaidList = generateSimplifiedRaidList(raidLists);
		setSimpleRaidList(simpleRaidList);
	}
}

