// ============================================================
// HIMALAYA-H2O
// PHASE 2 — JRC HISTORICAL WATER BASELINE
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
// 3. Load SRTM DEM
// ------------------------------------------------------------

var dem = ee.Image(
  'USGS/SRTMGL1_003'
).select('elevation');

// ------------------------------------------------------------
// 4. High-altitude mask
// ------------------------------------------------------------

var highAltitude = dem
  .gte(3000);

// ------------------------------------------------------------
// 5. Load JRC Global Surface Water
// ------------------------------------------------------------

var gsw = ee.Image(
  'JRC/GSW1_4/GlobalSurfaceWater'
);

// ------------------------------------------------------------
// 6. Select water occurrence
// ------------------------------------------------------------

var occurrence = gsw.select(
  'occurrence'
);

// ------------------------------------------------------------
// 7. Create persistent-water candidate
// ------------------------------------------------------------

// We start with >=50% occurrence.
// This is a PROJECT THRESHOLD that we will later test.

var persistentWater = occurrence
  .gte(50)
  .and(highAltitude)
  .selfMask()
  .clip(studyRegion);

// ------------------------------------------------------------
// 8. Display study area
// ------------------------------------------------------------

Map.centerObject(
  studyRegion,
  7
);

Map.addLayer(
  studyStates,
  {
    color: 'red'
  },
  'Study States',
  false
);

// ------------------------------------------------------------
// 9. Display water occurrence
// ------------------------------------------------------------

Map.addLayer(
  occurrence.clip(studyRegion),
  {
    min: 0,
    max: 100,
    palette: [
      'ffffff',
      'b3d9ff',
      '3399ff',
      '0066ff',
      '000066'
    ]
  },
  'JRC Water Occurrence',
  false
);

// ------------------------------------------------------------
// 10. Display persistent high-altitude water
// ------------------------------------------------------------

Map.addLayer(
  persistentWater,
  {
    palette: [
      '00ffff'
    ]
  },
  'Persistent Water >= 50%'
);

// ------------------------------------------------------------
// 11. Calculate total persistent-water area
// ------------------------------------------------------------

var waterArea = ee.Image
  .pixelArea()
  .updateMask(persistentWater)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: studyRegion,
    scale: 30,
    maxPixels: 1e10
  });

// Convert m² → km²

var waterAreaKm2 = ee.Number(
  waterArea.get('area')
).divide(1e6);

// ------------------------------------------------------------
// 12. Print results
// ------------------------------------------------------------

print(
  'Persistent high-altitude water area (km²):',
  waterAreaKm2
);

print(
  'JRC dataset:',
  gsw
);
// ------------------------------------------------------------
// 13. JRC transition
// ------------------------------------------------------------

var transition = gsw.select(
  'transition'
);

Map.addLayer(
  transition.clip(studyRegion),
  {
    min: 0,
    max: 10,
    palette: [
      'ffffff',
      '0000ff',
      '00ff00',
      'ff0000',
      'ffff00',
      'ff00ff',
      '00ffff',
      'ff8800',
      '8800ff',
      '008800',
      '880000'
    ]
  },
  'JRC Water Transition',
  false
);
