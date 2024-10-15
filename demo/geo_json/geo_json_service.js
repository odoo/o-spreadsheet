let mappingWorld = undefined;
let mappingUsa = undefined;

export const geoJsonService = {
  getAvailableRegions: function () {
    return [
      { id: "world", label: "World", defaultProjection: "mercator" },
      { id: "usa", label: "United States", defaultProjection: "albersUsa" },
      { id: "europe", label: "Europe", defaultProjection: "mercator" },
      { id: "asia", label: "Asia", defaultProjection: "mercator" },
      { id: "africa", label: "Africa", defaultProjection: "mercator" },
      { id: "north_america", label: "North America", defaultProjection: "conicConformal" },
      { id: "south_america", label: "South America", defaultProjection: "mercator" },
    ];
  },
  getTopoJson: async function (region) {
    if (region === "usa" && !mappingUsa) {
      const json = await getResource("./geo_json/usa_states_mapping.json");
      mappingUsa = inverseMapping(json);
    } else if (!mappingWorld) {
      const json = await getResource("./geo_json/world_country_iso_mapping.json");
      mappingWorld = inverseMapping(json);
    }

    return await getResource(`./geo_json/${region}.topo.json`);
  },
  geoFeatureNameToId: function (region, name) {
    const mapping = region === "usa" ? mappingUsa : mappingWorld;
    return mapping[name.toLowerCase()];
  },
};

function inverseMapping(mapping) {
  const inverse = {};
  for (const key in mapping) {
    for (const value of mapping[key]) {
      inverse[value.toLowerCase()] = key;
    }
  }
  return inverse;
}

const currentPromises = new Map();
const cache = new Map();

async function getResource(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }
  if (currentPromises.has(url)) {
    return currentPromises.get(url);
  }

  const promise = fetch(url, { method: "GET" })
    .then((res) => res.json())
    .then((json) => {
      cache.set(url, json);
      return json;
    })
    .finally(() => {
      currentPromises.delete(url);
    });

  currentPromises.set(url, promise);
  return promise;
}
