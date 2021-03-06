const WindowDatabase = {
	getItem: (key) => {
		try {
			return JSON.parse(window.name)[key];
		} catch(err) {
			return null;
		}
	},
	setItem: (key, value) => {
		let database;

		try {
			database = JSON.parse(window.name);
		} catch(err) {
			database = {};
		}

		database[key] = value;

		try {
			window.name = JSON.stringify(database);
		} catch(err) {
			console.error(`Cannot set value ${value} under ${key} in WindowDatabase`);
		}
	}
};

const DATABASE_KEYS = {
	scheduledRaidList: 'tbc-scheduled-raid-lists',
	lastSelectedRaidLists: 'tbc-last-selected-raid-lists'
};

const RepeatingRaidList = {
	isRepeatingRaidListEnabled: () => document.getElementById("tbc-repeat-enabled").checked,
	getRepeatCount: () => parseInt(document.getElementById("tbc-repeat-count").value),
	getRepeatIntervalInMin: () => parseInt(document.getElementById("tbc-repeat-interval-in-m").value),
	storeRepeatingRaidList: () => {
		WindowDatabase.setItem('tbc-repeating-raid-list', {
			count: parseInt(RepeatingRaidList.getRepeatCount()),
			intervalInMin: parseInt(RepeatingRaidList.getRepeatIntervalInMin()),
			times: RepeatingRaidList.scheduleRepeatingRaidList()
		})
	},
	resetRepeatingRaidLists: () => {
		WindowDatabase.setItem('tbc-repeating-raid-list', null);
		updateScheduledRaidLists([]);
		reloadPage();
	},
	getRepeatingRaidList: () => WindowDatabase.getItem('tbc-repeating-raid-list') || null,
	repeatingRaidListInProgress: () => {
		const repeatingRaidList = RepeatingRaidList.getRepeatingRaidList();
		return repeatingRaidList && repeatingRaidList.times && repeatingRaidList.times.length > 0
	},
	scheduleRepeatingRaidList: () => {
		const scheduledTimes = [];
		const intervalInMs = RepeatingRaidList.getRepeatIntervalInMin() * 60 * 1000;

		for (let i = 1; i <= RepeatingRaidList.getRepeatCount(); i++) {
			const randomDeviance = (Math.random() / 2.5) + 0.8;
			const delay = Math.floor(i * intervalInMs * randomDeviance);
			scheduledTimes.push(Date.now() + delay);
		}

		return scheduledTimes;
	},
	shouldSendNextWave: () => {
		if (RepeatingRaidList.repeatingRaidListInProgress()) {
			const settings = RepeatingRaidList.getRepeatingRaidList();
			return Date.now() >= parseInt(settings.times[0]);
		}
	},
	sendFirstWave: () => {
		const settings = RepeatingRaidList.getRepeatingRaidList();
		const now = Date.now();
		settings.times = settings.times.filter(time => time > now);
		WindowDatabase.setItem('tbc-repeating-raid-list', settings);
		submitSimpleRaidList();
	},
	waitUntilNextWaveShouldBeSent: () => {
		const infoBox = document.getElementById("tbc-repeating-info-box");
		const repeatingTimes = RepeatingRaidList.getRepeatingRaidList().times;
		document.getElementById("tbc-repeating-raid-list-in-progress-box").style.display = "block";
		document.getElementById("tbc-repeating-raid-list-settings").style.display = "none";

		const intervalId = setInterval(() => {
			infoBox.innerText = `Další vlna za ${Math.floor((repeatingTimes[0] - Date.now()) / 1000) + 1} sekund. Zbývá poslat ${repeatingTimes.length} vln.`;

			if (RepeatingRaidList.shouldSendNextWave()) {
				clearInterval(intervalId);
				reloadPage();
			}
		}, 250);
	}
};

function reloadPage() {
	window.location.reload();
}

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

function generateUberRaidList(raidListsInfo) {
	const simpleRaidLists = [];
	const lastSelectedRaidLists = getLastSelectedRaidLists();
	const left = [];
	const right = [];

	raidListsInfo.forEach(function(raidList, index) {
		let checked = '';
		if (lastSelectedRaidLists.indexOf(raidList.id) !== -1) {
			checked = ' checked';
		}

		const html = `<label><input type="checkbox" value="${raidList.id}"${checked}> ${raidList.title}</label><br>`;

		if (index < raidListsInfo.length / 2) {
			left.push(html);
		} else {
			right.push(html);
		}
	});

	const html = `<div style="float:left; width: 50%">${left.join("")}</div><div style="float:right; width: 50%">${right.join("")}</div>`;

	return `<div class="round listTitle">Uber Farmlist 1.2</div><div id="tbc-simple-raid-list-choices">${html}</div><div style="clear: both; padding: 10px 0">&nbsp;</div><div id="tbc-repeating-raid-list-settings">${generateSubmitButton()}${generateRepeatSettings()}</div><div id="tbc-repeating-raid-list-in-progress-box" style="display: none">${generateResetButton()}${generateInformBox()}</div>`;
}

function generateSubmitButton() {
	return `<input type="submit" id="tbc-submit-simple-raid-list" value="Odeslat jednou" style="width: 175px">`;
}

function generateResetButton() {
	return `<input type="submit" id="tbc-reset-repeating-list" value="Přestaň posílat!" style="width: 175px">`;
}

function generateRepeatSettings() {
	return `<span id="tbc-repeat-settings-bar" style="padding-left: 25px;"><label><input type="checkbox" id="tbc-repeat-enabled">Opakovat</label> <span id="tbc-repeat-number-bar" style="display: none"><input type="number" id="tbc-repeat-count" style="width: 50px" value="4">krát co <input type="number" id="tbc-repeat-interval-in-m" style="width: 50px" value="15"> minut. <br><span style="padding-left: 200px"><label><input type="checkbox" id="tbc-send-first-wave-immediately"> Poslat první vlnu hned</label></span></span></span>`;
}

function generateInformBox() {
	return `<span id="tbc-repeating-info-box" style="padding-left: 25px;"></span>`;
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
	const selectedRaidLists = getSelectedSimpleRaidLists();
	updateScheduledRaidLists(selectedRaidLists);
	sendSimpleRaidList();
	setLastSelectedRaidLists(selectedRaidLists);
}

function submitRaidLists() {
	if (RepeatingRaidList.isRepeatingRaidListEnabled()) {
		RepeatingRaidList.storeRepeatingRaidList();

		if (document.getElementById('tbc-send-first-wave-immediately').checked) {
			submitSimpleRaidList();
		} else {
			reloadPage();
		}
	} else {
		submitSimpleRaidList();
	}
}

function setLastSelectedRaidLists(selectedRaidLists) {
	WindowDatabase.setItem(DATABASE_KEYS.lastSelectedRaidLists, selectedRaidLists);
}

function getLastSelectedRaidLists() {
	return WindowDatabase.getItem(DATABASE_KEYS.lastSelectedRaidLists) || [];
}

function getSelectedSimpleRaidLists() {
	var selectedInputs = document.getElementById("tbc-simple-raid-list-choices").getElements("input:checked");
	var raidListIds = [];

	for (var i = 0; i < selectedInputs.length; i++) {
		raidListIds.push(selectedInputs[i].value);
	}

	return raidListIds;
}

function updateScheduledRaidLists(raidListIds) {
	WindowDatabase.setItem(DATABASE_KEYS.scheduledRaidList, {
		raidListIds: raidListIds,
		timestamp: Date.now()
	});
}

function getSchedulesRaidLists() {
	try {
		var data = WindowDatabase.getItem(DATABASE_KEYS.scheduledRaidList) || {};

		if (isNaN(data.timestamp)) {
			return [];
		}

		return data.raidListIds;
	} catch(err) {
		console.log(err.message);
		return [];
	}
}

function getNextRaidList() {
	var scheduledRaidLists = getSchedulesRaidLists();

	if (scheduledRaidLists && scheduledRaidLists.length > 0) {
		return scheduledRaidLists[0];
	}
}

function initListeners() {
	document.getElementById("tbc-submit-simple-raid-list").onclick = submitRaidLists;
	document.getElementById("tbc-repeat-enabled").onclick = toggleRepeatingRaidList;
	document.getElementById("tbc-reset-repeating-list").onclick = resetRepeatingRaidLists;
}

function resetRepeatingRaidLists() {
	RepeatingRaidList.resetRepeatingRaidLists();
}

function toggleRepeatingRaidList() {
	if (RepeatingRaidList.isRepeatingRaidListEnabled()) {
		document.getElementById('tbc-repeat-number-bar').style.display = "inline";
		document.getElementById('tbc-submit-simple-raid-list').value = "Odeslat vícekrát";
	} else {
		document.getElementById('tbc-repeat-number-bar').style.display = "none";
		document.getElementById('tbc-submit-simple-raid-list').value = "Odeslat jednou";
	}
}

function sendSimpleRaidList() {
	var scheduledRaidList = getNextRaidList();
	console.log(`Next Raid List to send: ${scheduledRaidList}`);

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

function markAllVillagesInRaidList(raidListId) {
	Travian.Game.RaidList.markAllSlotsOfAListForRaid(parseInt(raidListId), true);
}

function shouldSendNextRaidList() {
	return getSchedulesRaidLists().length > 0;
}

function renderUberRaidList() {
	const raidLists = getRaidLists();
	const simpleRaidList = generateUberRaidList(raidLists);
	setSimpleRaidList(simpleRaidList);
}

if (document.getElementById("raidList")) {
	renderUberRaidList();

	if (shouldSendNextRaidList()) {
		const delay = (Math.random() * 1000) + 500;
		console.log(`I'm sending next raid list in ${delay} ms`);
		setTimeout(sendSimpleRaidList, delay);
	} else {
		if (RepeatingRaidList.repeatingRaidListInProgress()) {
			if (RepeatingRaidList.shouldSendNextWave()) {
				RepeatingRaidList.sendFirstWave();
			} else {
				RepeatingRaidList.waitUntilNextWaveShouldBeSent();
			}
		}
	}
}
