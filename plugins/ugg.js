const { map } = require('lodash');
const { getJson, sortRunes } = require('./utils');

// U.GG API consts
// data[servers][tiers][positions][0][stats][perks/shards]
const u = {
  positions: {
    jungle: 1,
    support: 2,
    adc: 3,
    top: 4,
    mid: 5
  },
  positionsReversed: {
    1: 'Jungle',
    2: 'Support',
    3: 'ADC',
    4: 'Top',
    5: 'Mid'
  },
  tiers: {
    challenger: 1,
    master: 2,
    diamond: 3,
    platinum: 4,
    gold: 5,
    silver: 6,
    bronze: 7,
    overall: 8,
    platPlus: 10,
    diaPlus: 11
  },
  servers: {
    na: 1,
    euw: 2,
    kr: 3,
    eune: 4,
    br: 5,
    las: 6,
    lan: 7,
    oce: 8,
    ru: 9,
    tr: 10,
    jp: 11,
    world: 12
  },
  stats: {
    perks: 0,
    statShards: 8
  },
  perks: {
    games: 0,
    won: 1,
    mainPerk: 2,
    subPerk: 3,
    perks: 4
  },
  shards: {
    games: 0,
    won: 1,
    stats: 2
  }
};

// KEY CONSTS - UPDATE THESE ACCORDING TO GUIDE https://gist.github.com/paolostyle/fe8ce06313d3e53c134a24762b9e519c
const uGGAPIVersion = '1.1';

const server = u.servers.world;
const tier = u.tiers.platPlus;

const getUGGFormattedLolVersion = lolVer =>
  lolVer
    .split('.')
    .splice(0, 2)
    .join('_');

function extractPage(champion) {
  return (item, key) => {
    const perksData = item[0][u.stats.perks];
    const statShards = item[0][u.stats.statShards][u.shards.stats].map(str => parseInt(str, 10));

    const primaryStyleId = perksData[u.perks.mainPerk];
    const subStyleId = perksData[u.perks.subPerk];

    const selectedPerkIds = sortRunes(perksData[u.perks.perks], primaryStyleId, subStyleId).concat(
      statShards
    );

    return {
      name: `${champion} ${u.positionsReversed[key]}`,
      primaryStyleId,
      subStyleId,
      selectedPerkIds,
      games: perksData[u.perks.games],
      bookmark: {
        src: '',
        meta: {
          pageType: key,
          champion
        },
        remote: {
          name: 'U.GG',
          id: 'ugg'
        }
      }
    };
  };
}

async function getDataSource(champion, version = null) {
  let returnVal = [];

  // try last two lol-version
  for (const lolVersion of freezer.get().lolversions.slice(0, 2)) {
      try {
          console.log(lolVersion);
          let lolVersionUGG = getUGGFormattedLolVersion(lolVersion);

          const overviewVersion = "1.4.0";
          const championDataUrl = `https://static.u.gg/assets/lol/riot_static/${lolVersion}/data/en_US/champion.json`;
          console.log(`U.GG DataUrl => ${championDataUrl}`);

          const championData = await getJson(championDataUrl);
          const championId = championData.data[champion].key;
          console.log(`U.GG => ${lolVersionUGG}`);
          const championStatsUrl = `https://stats2.u.gg/lol/${uGGAPIVersion}/overview/${lolVersionUGG}/ranked_solo_5x5/${championId}/${overviewVersion}.json`;
          console.log(`U.GG ReqUrl => ${championStatsUrl}`);

          returnVal = await getJson(championStatsUrl);

          if (returnVal.length > 0)
              break;
      } catch (e) {
          if (e.name === 'StatusCodeError' && e.statusCode == 403) {
              continue;
          } else {
              throw Error(e);
          }
      }
  };

  return returnVal;
}

async function updateBookmark(champion, pageId, callback) {
  try {
    const championStats = await getDataSource(champion);
    const page = extractPage(champion)(championStats[server][tier][pageId], pageId);
    delete page.games;
    callback(page);
  } catch (e) {
    callback({});
    throw Error(e);
  }
}

async function _getPages(champion, callback) {
  const runePages = { pages: {} };

  try {
    const championStats = await getDataSource(champion);

    let pages = map(championStats[server][tier], extractPage(champion));
    let totalGames = pages.reduce((total, current) => (total += current.games), 0);

    pages = pages.filter(page => {
      const positionPercentage = page.games / totalGames;
      delete page.games;
      return positionPercentage > 0.1;
    });

    pages.forEach(page => {
      runePages.pages[page.name] = page;
    });

    callback(runePages);
  } catch (e) {
    callback(runePages);
    throw Error(e);
  }
}

const plugin = {
  id: 'ugg',
  name: 'U.GG',
  active: true,
  bookmarks: true,
  getPages(champion, callback) {
    _getPages(champion, callback);
  },
  syncBookmark(bookmark, callback) {
    updateBookmark(bookmark.meta.champion, bookmark.meta.pageType, callback);
  }
};

module.exports = { plugin };
