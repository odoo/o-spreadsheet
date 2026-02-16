## How to regenate the topo json data

1. Find a source of geoJSON data (for instance https://www.naturalearthdata.com/downloads/110m-cultural-vectors/) that covers the whole earth
2. convert it as topoJSON files (for instance https://jeffpaine.github.io/geojson-topojson/)
3. split the topoJSON file by regions. Example:

   ```bash
    # CROP world topojson to region:

    # requires mapshaper CLI https://github.com/mbloch/mapshaper

    # use `mapshaper -clip` with a specifing bounding box to delimitate continent or geographic regions, see https://github.com/mbloch/mapshaper/wiki/Command-Reference#-clip

    # europe:
    mapshaper world.topo.json -clip bbox=-25,30,38,75 -o europe.topo.json
    #Asia:
    mapshaper world.topo.json -clip bbox=17,-10,170,80 -o asia.topo.json
    #Oceania:
    mapshaper world.topo.json -clip bbox=100,-50,230,0 -o oceania.topo.json
    # Africa:
    mapshaper world.topo.json -clip bbox=-25,-40,60,40 -o africa.topo.json
    # North America:
    mapshaper world.topo.json -clip bbox=-180,5,-10,120 -o na.json
    mapshaper na.json -filter '!["RU", "MR", "GW", "SN", "ML", "LR", "GN", "SL", "EH", "MA", "IS", "VE", "CO", "GY", "GM"].includes(this.properties.FID)' -o north_america.topo.json
    # South America:
    mapshaper world.topo.json -clip bbox=-150,-120,-30,12 -o south_america.topo.json
   ```
