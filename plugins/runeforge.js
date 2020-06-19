var request = require('request');
const { getStylesMap, getPerksMapMap } = require('./utils');

var runeforge;
var connected = false;

function connect(callback) {
	request.post("http://runeforge.gg/all-loadouts-data.json", (error, response, data) => {
		if(!error && response.statusCode == 200) {
			runeforge = JSON.parse(data);
			callback(true);
		}
		else {
			callback(false);
			throw Error("runeforge json not loaded");
		}
	});
}

connect((res) => { connected = res; });

var cheerio = require('cheerio');

var stylesMap = { };
var perksMap = { 
	"Coup De Grace": 8014,
	"Future\u2019s Market": 8321
};
var perksMapFixLen = Object.keys(perksMap).length;

var shardsMap = {
	"shard-health": 5001,
	"shard-armor": 5002,
	"shard-mr": 5003,
	"shard-as": 5005,
	"shard-cdr": 5007,
	"shard-af": 5008,

	"shard-armor-1": 5002,
	"shard-hybrid-2-1": 5002,
	"shard-hybrid": 5002
};

function exctractPage(html, pageUrl) {
	console.log(pageUrl)
	var $ = cheerio.load(html);

	if(typeof pageUrl === "undefined") {
		pageUrl = $("link[rel='canonical']").attr("href");
	}

	var path = $("div.rune-paths").first();

	var name = $(".loadout-title").text();
	if(name.length > 22) name = name.substring(0, 22) + "..."

	var page = {
			"name": name,
			"primaryStyleId": -1,
			"selectedPerkIds": [0, 0, 0, 0, 0, 0, 0, 0, 0],
			"subStyleId": -1,
			"bookmark": { "src": pageUrl, "remote": { "name": plugin.name, "id": plugin.id } }
		};

	var data = [];
    $("li.rune-path--rune", path).each(function () {
        data.push($(this).attr("data-link-title"));
	});

	stylesMap = Object.keys(stylesMap).length == 0 ? getStylesMap() : stylesMap;
	page.primaryStyleId = stylesMap[$("div.rune-path--primary .rune-path--path", path).attr("data-content-title")];
	page.subStyleId = stylesMap[$("div.rune-path--secondary .rune-path--path", path).attr("data-content-title")];

	perksMap = Object.keys(perksMap).length == perksMapFixLen ? Object.assign(perksMap, getPerksMapMap()) : perksMap;
    for (var i = 0; i < data.length; i++) {
		page.selectedPerkIds[i] = perksMap[data[i]];
	}

	var shards = [];

	var shardsPath = $("div.stat-shards").first();
	$("img", shardsPath).each(function() {
		var shardLink = $(this).attr("src").split("/");
		var shardName = shardLink[shardLink.length - 1].replace(".svg", "");
		shards.push(shardsMap[shardName]);
	});

	page.selectedPerkIds[6] = shards[0];
	page.selectedPerkIds[7] = shards[1];
	page.selectedPerkIds[8] = shards[2];

	console.log(page)
	return page;
}

function _getPages(champion, callback) {
	var res = {pages: {}};

	if(!runeforge) return callback(res);

	var pageUrls = [];

	for(var i = 0; i < runeforge.length; i++) {
		var pageData = runeforge[i];
		var sep = pageData.loadout_champion_grid.split("/");
		sep = sep[sep.length - 1].split(".")[0];
		if(champion == sep) {
			pageUrls.push(pageData.loadout_url);
		}
	}

	if(pageUrls.length === 0) return callback(res);

	var callCount = 0;
	for(var i = 0; i < pageUrls.length; i++) {

		request.post(pageUrls[i], (error, response, html) => {
			if(!error && response.statusCode == 200) {
				var page = exctractPage(html);
				res.pages[page.name] = page;
				if(++callCount == pageUrls.length) callback(res);
			}
			else {
				callback(res);
				throw Error("rune page not loaded");
			}
		});
	}
}

var plugin = {
	id: "runeforge",
	name: "Rune Forge",
	active: true,
	bookmarks: true,

	getPages(champion, callback) {
		if(!connected) connect((res) => {
			connected = res;
			_getPages(champion, callback);
		});
		else _getPages(champion, callback);
	},

	syncBookmark(bookmark, callback) {
		request.post(bookmark.src, (error, response, html) => {
			if(!error && response.statusCode == 200) {
				callback(exctractPage(html, bookmark.src));
			}
			else {
				callback();
				throw Error("rune page not loaded");
			}
		});
	}
}

module.exports = { plugin };
