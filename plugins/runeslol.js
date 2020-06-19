var cheerio = require('cheerio');
var request = require('request');
const { getStylesMap, getPerksMapMap } = require('./utils');

var baseUrl = "https://runes.lol";
var url = baseUrl + "/{gamemode}/platinum/plus/champion/{page}/{champion}/{role}";
var modeWin = "win";
var modePick = "pick";
var gamemodeRanked = "ranked";
var gamemodeAram = "aram";

var stylesMap = {};
var perksMap = {};

function extractPage(html, pageName, pageUrl) {
		
	var $ = cheerio.load(html);
	var page = {
		"name": pageName,
		"primaryStyleId": -1,
		"selectedPerkIds": [0, 0, 0, 0, 0, 0],
		"subStyleId": -1,
		"bookmark": { "src": pageUrl, "pName": pageName, "remote": { "name": plugin.name, "id": plugin.id } }
	};

	//getting keystone divs
	var keystones = [];
	
	$(".pure-u-8-24 > .runetitle").each(function() { keystones.push($(this).text()); });

	stylesMap = Object.keys(stylesMap).length == 0 ? getStylesMap() : stylesMap;
	perksMap = Object.keys(perksMap).length == 0 ? getPerksMapMap() : perksMap;

	page.primaryStyleId = stylesMap[keystones[0]];
	page.subStyleId = stylesMap[keystones[1]];

	// 2, 4, 6, 7 - main runes, 3, 5 - secondary runes
	page.selectedPerkIds[0] = perksMap[keystones[2]];
	page.selectedPerkIds[1] = perksMap[keystones[4]];
	page.selectedPerkIds[2] = perksMap[keystones[6]];
	page.selectedPerkIds[3] = perksMap[keystones[7]];
	page.selectedPerkIds[4] = perksMap[keystones[3]];
	page.selectedPerkIds[5] = perksMap[keystones[5]];

	return page;		
}

function fillUrl(urlToReplace, gamemode, page, champion, role) {
	return urlToReplace.replace("{gamemode}", gamemode).replace("{page}", page).replace("{champion}", champion).replace("{role}", role)
}

function _getPages(champion, callback) {
	var res = {pages: {}};

	//getting main page
	console.log("getting main page for " + champion);
	var pages = [];
	request(fillUrl(url, gamemodeRanked, modeWin, champion, ""), function(error, response, html) {
		if(!error && response.statusCode == 200) {				
			//adding ARAM pages
			pages.push({page: fillUrl(url, gamemodeAram, modeWin, champion, ""), name: "ARAM - HW"});
			pages.push({page: fillUrl(url, gamemodeAram, modePick, champion, ""), name: "ARAM - MP"});
			
			var $ = cheerio.load(html);
			var lanes = [];
			$("a.lanefilter").not(".active").each(function() { lanes.push($(this).attr("href")); });

			// if there are no separate roles
			if(lanes.length == 0) {
				pages.push({page: fillUrl(url, gamemodeRanked, modeWin, champion, "" ), name: "Normal - HW"});
				pages.push({page: fillUrl(url, gamemodeRanked, modePick, champion, ""), name: "Normal - MP"});
			}
			// we get the pages for the specific lanes
			else if (lanes.length > 1) {
				for (var i = 0; i < lanes.length; i++) {
					pages.push({page: baseUrl + lanes[i], name: "Normal - " + lanes[i].split("/").filter(String).slice(-1)[0] + " - HW"});
					pages.push({page: baseUrl + lanes[i].replace("/" + modeWin + "/", "/" + modePick + "/"), name: "Normal - " + lanes[i].split("/").filter(String).slice(-1)[0] + " - MP"});
				}
			}

			var count = pages.length;

			for(var i = 0; i < pages.length; i++) {
				console.log("getting " + pages[i].name);
				// we send our custom pagename with the request so we can distuingish between pages in the response
				request({ url: pages[i].page, headers: {"X-PageName": pages[i].name}}, function(error, response, html) {
					if(!error && response.statusCode == 200) {
						var page = extractPage(html, response.request.headers["X-PageName"], response.request.uri.href);
						
						res.pages[page.name] = page;
						console.log("extracted " + page.name);
						count--;
						if(count == 0) {
							ordered = {};
							//we sort it back
							Object.keys(res.pages).sort().forEach(function(key) {
								ordered[key] = res.pages[key];
							  });

							  res.pages = ordered;
							  
							callback(res);
						}
					}
				});			
			}
		}
		else {
			callback(res);
			throw Error("failed to load main page for " + champion);
		}
	});	
}

var plugin = {
	id: "runeslol",
	name: "Runes LoL",
	active: true,
	bookmarks: true,

	getPages(champion, callback) {
		_getPages(champion, callback);
	},

	syncBookmark(bookmark, callback) {
		request(bookmark.src, function(error, response, html) {
			if(!error && response.statusCode == 200) {
				callback(extractPage(html, bookmark.pName, bookmark.src));
			}
			else {
				console.log(bookmark);
				throw Error("unable to sync " + bookmark.src);
			}
		});
	}
}

module.exports = { plugin };
