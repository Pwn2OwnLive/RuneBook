var request = require('request');
var cheerio = require('cheerio');
const { getStylesMap, getPerksMapMap } = require('./utils');

var url = "http://champion.gg";

var stylesMap = {};
var perksMap = {};
var statsMap = {
    "Scaling Health": 5001,
    "Armor": 5002,
    "Magic Resist": 5003,
    "Attack Speed": 5005,
    "Scaling Cooldown Reduction": 5007,
    "Adaptive Force": 5008
};

function exctractPage(html, champion, rec, callback, pageType) {
	var $ = cheerio.load(html);

	var pages = [];
	var runecount = -1;
	var slots = $("div[class^=Slot__RightSide]");

	var role = $(`li[class^='selected-role'] a[href^='/champion/${champion}']`).first();

	$("div[class*='Description__Title']", slots).each(function(index) {
		if(index % 11 == 0) {
			pages.push({
				"name": $(".champion-profile h1").text() + " " + role.text().trim() + (Math.floor(runecount / 9) ? " HW" : " MF"),
				"primaryStyleId": -1,
				"selectedPerkIds": [0, 0, 0, 0, 0, 0],
				"subStyleId": -1,
				"bookmark": {
					"src": url + role.attr("href"),
					"meta": {
						"pageType": Math.floor(index / 11),
						"champion": champion
					},
					"remote": { "name": plugin.name, "id": plugin.id }
				}
			})
		}

		stylesMap = Object.keys(stylesMap).length == 0 ? getStylesMap() : stylesMap;
		var rune = $(this).text();
		rune = rune.replace(".png", "");
		console.log(rune)
		if(index % 11 == 0) {
			pages[pages.length - 1].primaryStyleId = stylesMap[rune];
			return;
		}
		else if(index % 11 == 5) {
			pages[pages.length - 1].subStyleId = stylesMap[rune];
			return;
		}
		else runecount++;
		
		perksMap = Object.keys(perksMap).length == 0 ? getPerksMapMap() : perksMap;
		let perksMapMapped = Object.assign(perksMap, statsMap);
		pages[pages.length - 1].selectedPerkIds[runecount % 9] = perksMapMapped[rune];
	});

	if(rec) {
		var reqCount = 0;
		var els = $(`li[class!='selected-role'] a[href^='/champion/${champion}']`);
		console.log("IF REC TRUE")
		console.log("ELS length", els.length)
		if(els.length == 0) return callback(pages);
		els.each(function(index) {
			console.log(url + "/champion/" + champion + "/" + $(this).text().trim())
			request.get(url + "/champion/" + champion + "/" + $(this).text().trim(), (error, response, _html) => {
				if(!error && response.statusCode == 200) {
					var newPages = exctractPage(_html, champion, false);
					pages = pages.concat(newPages);
					console.log("newPages", newPages)
					if(++reqCount == els.length) callback(pages);
				}
			});
		});
	}
	return ((typeof pageType !== "undefined") ? pages[pageType] : pages);
}

function _getPages(champion, callback) {
	var res = {pages: {}};

	var champUrl = url + "/champion/" + champion;
	console.log(champUrl)
	request.get(champUrl, (error, response, html) => {
		if(!error && response.statusCode == 200) {
			exctractPage(html, champion, true, (pages) => {
				pages.forEach((page) => {
					res.pages[page.name] = page;
				});
				console.log(res)
				callback(res);
			});
		}
		else {
			callback(res);
			throw Error("rune page not loaded");
		}
	});
}

var plugin = {
	id: "championgg",
	name: "Champion.gg",
	active: true,
	bookmarks: true,

	getPages(champion, callback) {
		_getPages(champion, callback);
	},

	syncBookmark(bookmark, callback) {
		request.get(bookmark.src, (error, response, html) => {
			if(!error && response.statusCode == 200) {
				callback(exctractPage(html, bookmark.meta.champion, false, null, bookmark.meta.pageType));
			}
			else {
				throw Error("rune page not loaded");
			}
		});
	}
}

module.exports = { plugin };