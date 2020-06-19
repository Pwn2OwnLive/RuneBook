var cheerio = require('cheerio');
var rp = require('request-promise-native');
const { getPerksMapMap } = require('./utils');

const baseUrl = "https://www.metasrc.com/";
const rankFilter = "?ranks=platinum,diamond,master,grandmaster,challenger";
const modesToIgnore = ['tft'];

var perksMap = { };
var statsMap = {
    "statmodshealthscalingicon": 5001,
    "statmodsarmoricon": 5002,
    "statmodsmagicresicon": 5003,
    "statmodsattackspeedicon": 5005,
    "statmodscdrscalingicon": 5007,
    "statmodsadaptiveforceicon": 5008
};

async function getPage(requestUri, champInfo) {
    var page = {
        "name": name,
        "primaryStyleId": -1,
        "selectedPerkIds": [0, 0, 0, 0, 0, 0, 0, 0, 0],
        "subStyleId": -1,
        "bookmark": {
            "src": requestUri,
            "remote": {
                "name": plugin.name,
                "id": plugin.id
            }
        }
    };

    try {
        var modeUrlBase = baseUrl + requestUri + rankFilter;
        modeUrlBase = modeUrlBase.replace(/([^:]\/)\/+/g, "$1");
        var urlParts = requestUri.split('/');

        if (!champInfo) {
            champInfo = freezer.get().championsinfo;
            champInfo = champInfo[Object.keys(champInfo).find(k => k.toLowerCase() === urlParts[3].toLowerCase())];
        }

        if (urlParts[3].search(new RegExp(champInfo.id, "i")) == -1) {
            return;
        }

        page.name = "[" + urlParts[1].toUpperCase() + "] " + champInfo.name;
        if (urlParts.length > 4){
            var lane = urlParts[4];
            page.name += ` ${lane[0].toUpperCase()}${lane.slice(1)}`;
        }

        var response = await getResponseFromUrl(modeUrlBase, "Error when determining the rune page");
        var $ = cheerio.load(response.body);

        var ids = $('svg > image[data-xlink-href]').map((i, x) => getIdFromImageUrl($(x).attr('data-xlink-href'))).toArray();

        page['primaryStyleId'] = ids[0];
        page.selectedPerkIds[0] = ids[1];
        page.selectedPerkIds[1] = ids[2];
        page.selectedPerkIds[2] = ids[3];
        page.selectedPerkIds[3] = ids[4];
        page['subStyleId'] = ids[5];
        page.selectedPerkIds[4] = ids[6];
        page.selectedPerkIds[5] = ids[7];
        page.selectedPerkIds[6] = ids[8];
        page.selectedPerkIds[7] = ids[9];
        page.selectedPerkIds[8] = ids[10];
    } catch (e) {
        throw Error(e);
    }

    return page;
}

function getPerksMap(){
    if(Object.keys(perksMap).length == 0){
        for (const [key, value] of Object.entries(getPerksMapMap('icon'))) {
            var fileName = key.split('/').pop().replace(/\.[^/.]+$/, "");
            perksMap[fileName.toLowerCase()] = value;
          }
    }
    
    return Object.assign(perksMap, statsMap);
}

function getIdFromImageUrl(url) {
    var perkId = -1;

    var fileName = url.split('/').pop().replace(/\.[^/.]+$/, "");

    if (url.includes('perks')) {
        perkId = parseInt(fileName);
    } else {
        perkId = getPerksMap()[fileName];
    }

    return perkId || -1;
}

async function getModeUrls(champion) {
    var returnVals = [];

    try {
        var response = await getResponseFromUrl(baseUrl, "Error when determining the modes");
        var $ = cheerio.load(response.body);

        $('div[id=mode-nav] a[href]').each((index, elem) => {
            var modeUrlBase = $(elem).attr('href');

            if (modesToIgnore.some(element => modeUrlBase.includes(element))) {
                return;
            }

            // ToDo: create helper for combine pathes
            var modeUrl = baseUrl + modeUrlBase + '/champion/' + champion;
            modeUrl = modeUrl.replace(/([^:]\/)\/+/g, "$1");

            returnVals.push(modeUrl);
        });
    } catch (e) {
        throw Error(e);
    }

    return returnVals;
}

// ToDo: maybe we should put this in a helper
async function getResponseFromUrl(requestUri, errorMsg = '') {
    var options = {
        uri: requestUri,
        resolveWithFullResponse: true
    };

    return await rp(options)
        .then(function(response) {
            return response;
        })
        .catch(function(err) {
            throw Error(errorMsg + " => " + err);
        });
}

async function _getPages(champion, callback) {
    const runePages = {
        pages: {}
    };

    var champInfo = freezer.get().championsinfo[champion];

    try {
        var gameModeUrls = await getModeUrls(champInfo.id);

        // determine last 3 LoL versions
        var versions = freezer.get().lolversions.slice(0,10).map(versItem => {
            return versItem.split('.').slice(0, 2).join('.');
        }).filter(function(elem, index, self) {
            return index === self.indexOf(elem);
        }).slice(0,3);

        for (var i = 0, len = gameModeUrls.length; i < len; i++) {
            var response = await getResponseFromUrl(gameModeUrls[i], "Error when determining lanes");
            var $ = cheerio.load(response.body);

            // Determine available versions
            let modeVersions = $('select[id=patch] > option').map(function() {
                return $(this).text().trim();
            }).toArray()[0];

            if(!versions.includes(modeVersions))
                continue;

            for (let [index, elem] of Object.entries($('div[id=splash-content] > div > div > div > a'))){
                if(isNaN(index))
                    continue;
                var runePage = await getPage($(elem).attr('href').trim(), champInfo);
                if (runePage) {
                    runePages.pages[runePage.name] = runePage;
                }
            }          
        }

        const ordered = {};
        Object.keys(runePages.pages).sort().forEach(function(key) {
            ordered[key] = runePages.pages[key];
        });
        runePages.pages = ordered;

        callback(runePages);
    } catch (e) {
        callback(runePages);
        throw Error(e);
    }
}

var plugin = {
    id: "metasrc",
    name: "METAsrc",
    active: true,
    bookmarks: false,

    getPages(champion, callback) {
        _getPages(champion, callback);
    },

    syncBookmark(bookmark, callback) {
        getPage(bookmark.src).then(function(runePage) {
            callback(runePage);
        }).catch(function(err) {
            throw Error("rune page not loaded");
        });
    }
};

module.exports = {
    plugin
};