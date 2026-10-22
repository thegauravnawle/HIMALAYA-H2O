// ============================================================
// HIMALAYA-H2O
// PHASE 1B — ELEVATION ZONES
// ============================================================

// ------------------------------------------------------------
// 1. Load Indian state boundaries
// ------------------------------------------------------------

var states = ee.FeatureCollection(
  'FAO/GAUL/2015/level1'
);

// ------------------------------------------------------------
// 2. Select Himachal Pradesh + Uttarakhand
// ------------------------------------------------------------

var studyStates = states
  .filter(
    ee.Filter.eq('ADM0_NAME', 'India')
  )
  .filter(
    ee.Filter.inList(
      'ADM1_NAME',
      [
        'Himachal Pradesh',
        'Uttarakhand'
      ]
    )
  );

var studyRegion = studyStates.geometry();

// ------------------------------------------------------------
// 3. Load DEM
// ------------------------------------------------------------

var dem = ee.Image(
  'USGS/SRTMGL1_003'
).select('elevation');

// ------------------------------------------------------------
// 4. Create elevation zones
// ------------------------------------------------------------

// 3000–3500 m
var zone3000_3500 = dem.gte(3000)
  .and(dem.lt(3500))
  .selfMask()
  .clip(studyRegion);

// 3500–4000 m
var zone3500_4000 = dem.gte(3500)
  .and(dem.lt(4000))
  .selfMask()
  .clip(studyRegion);

// 4000–4500 m
var zone4000_4500 = dem.gte(4000)
  .and(dem.lt(4500))
  .selfMask()
  .clip(studyRegion);

// 4500–5000 m
var zone4500_5000 = dem.gte(4500)
  .and(dem.lt(5000))
  .selfMask()
  .clip(studyRegion);

// >5000 m
var zoneAbove5000 = dem.gte(5000)
  .selfMask()
  .clip(studyRegion);

// ------------------------------------------------------------
// 5. Display
// ------------------------------------------------------------

Map.centerObject(studyRegion, 7);

Map.addLayer(
  zone3000_3500,
  {palette: ['00ff00']},
  '3000–3500 m'
);

Map.addLayer(
  zone3500_4000,
  {palette: ['ffff00']},
  '3500–4000 m'
);

Map.addLayer(
  zone4000_4500,
  {palette: ['ff9900']},
  '4000–4500 m'
);

Map.addLayer(
  zone4500_5000,
  {palette: ['ff0000']},
  '4500–5000 m'
);

Map.addLayer(
  zoneAbove5000,
  {palette: ['9900ff']},
  '>5000 m'
);

// ------------------------------------------------------------
// 6. Calculate area of each zone
// ------------------------------------------------------------

function calculateArea(mask, name) {

  var area = ee.Image.pixelArea()
    .updateMask(mask)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyRegion,
      scale: 30,
      maxPixels: 1e10
    });

  var areaKm2 = ee.Number(
    area.get('area')
  ).divide(1e6);

  print(
    name + ' area (km²):',
    areaKm2
  );
}

// ------------------------------------------------------------
// 7. Print areas
// ------------------------------------------------------------

calculateArea(
  zone3000_3500,
  '3000–3500 m'
);

calculateArea(
  zone3500_4000,
  '3500–4000 m'
);

calculateArea(
  zone4000_4500,
  '4000–4500 m'
);

calculateArea(
  zone4500_5000,
  '4500–5000 m'
);

calculateArea(
  zoneAbove5000,
  '>5000 m'
);// ============================================================
// HIMALAYA-H2O
// PHASE 1B — ELEVATION ZONES
// ============================================================

// ------------------------------------------------------------
// 1. Load Indian state boundaries
// ------------------------------------------------------------

var states = ee.FeatureCollection(
  'FAO/GAUL/2015/level1'
);

// ------------------------------------------------------------
// 2. Select Himachal Pradesh + Uttarakhand
// ------------------------------------------------------------

var studyStates = states
  .filter(
    ee.Filter.eq('ADM0_NAME', 'India')
  )
  .filter(
    ee.Filter.inList(
      'ADM1_NAME',
      [
        'Himachal Pradesh',
        'Uttarakhand'
      ]
    )
  );

var studyRegion = studyStates.geometry();

// ------------------------------------------------------------
// 3. Load DEM
// ------------------------------------------------------------

var dem = ee.Image(
  'USGS/SRTMGL1_003'
).select('elevation');

// ------------------------------------------------------------
// 4. Create elevation zones
// ------------------------------------------------------------

// 3000–3500 m
var zone3000_3500 = dem.gte(3000)
  .and(dem.lt(3500))
  .selfMask()
  .clip(studyRegion);

// 3500–4000 m
var zone3500_4000 = dem.gte(3500)
  .and(dem.lt(4000))
  .selfMask()
  .clip(studyRegion);

// 4000–4500 m
var zone4000_4500 = dem.gte(4000)
  .and(dem.lt(4500))
  .selfMask()
  .clip(studyRegion);

// 4500–5000 m
var zone4500_5000 = dem.gte(4500)
  .and(dem.lt(5000))
  .selfMask()
  .clip(studyRegion);

// >5000 m
var zoneAbove5000 = dem.gte(5000)
  .selfMask()
  .clip(studyRegion);

// ------------------------------------------------------------
// 5. Display
// ------------------------------------------------------------

Map.centerObject(studyRegion, 7);

Map.addLayer(
  zone3000_3500,
  {palette: ['00ff00']},
  '3000–3500 m'
);

Map.addLayer(
  zone3500_4000,
  {palette: ['ffff00']},
  '3500–4000 m'
);

Map.addLayer(
  zone4000_4500,
  {palette: ['ff9900']},
  '4000–4500 m'
);

Map.addLayer(
  zone4500_5000,
  {palette: ['ff0000']},
  '4500–5000 m'
);

Map.addLayer(
  zoneAbove5000,
  {palette: ['9900ff']},
  '>5000 m'
);

// ------------------------------------------------------------
// 6. Calculate area of each zone
// ------------------------------------------------------------

function calculateArea(mask, name) {

  var area = ee.Image.pixelArea()
    .updateMask(mask)
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: studyRegion,
      scale: 30,
      maxPixels: 1e10
    });

  var areaKm2 = ee.Number(
    area.get('area')
  ).divide(1e6);

  print(
    name + ' area (km²):',
    areaKm2
  );
}

// ------------------------------------------------------------
// 7. Print areas
// ------------------------------------------------------------

calculateArea(
  zone3000_3500,
  '3000–3500 m'
);

calculateArea(
  zone3500_4000,
  '3500–4000 m'
);

calculateArea(
  zone4000_4500,
  '4000–4500 m'
);

calculateArea(
  zone4500_5000,
  '4500–5000 m'
);

calculateArea(
  zoneAbove5000,
  '>5000 m'
);
