// ============================================================
// HIMALAYA-H2O
// PHASE 2B — HIGH-ALTITUDE WATERBODY CANDIDATES
// ============================================================

// ------------------------------------------------------------
// 1. Study region
// ------------------------------------------------------------

var states = ee.FeatureCollection(
  'FAO/GAUL/2015/level1'
);

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
// 2. DEM
// ------------------------------------------------------------

var dem = ee.Image(
  'USGS/SRTMGL1_003'
).select('elevation');

// ------------------------------------------------------------
// 3. High-altitude mask
// ------------------------------------------------------------

var highAltitude = dem.gte(3000);

// ------------------------------------------------------------
// 4. JRC Global Surface Water
// ------------------------------------------------------------

var gsw = ee.Image(
  'JRC/GSW1_4/GlobalSurfaceWater'
);

var occurrence = gsw.select(
  'occurrence'
);

// ------------------------------------------------------------
// 5. Persistent water candidate
// ------------------------------------------------------------

var water = occurrence
  .gte(50)
  .and(highAltitude)
  .selfMask()
  .clip(studyRegion);

// ------------------------------------------------------------
// 6. Remove tiny isolated pixels
// ------------------------------------------------------------

// Require at least 8 connected neighbouring pixels.
//
// This helps reduce isolated noise.

var connected = water
  .updateMask(
    water.connectedPixelCount(
      100,
      true
    ).gte(8)
  );

// ------------------------------------------------------------
// 7. Display water candidates
// ------------------------------------------------------------

Map.centerObject(
  studyRegion,
  7
);

Map.addLayer(
  connected,
  {
    palette: ['00ffff']
  },
  'Waterbody Candidates'
);

// ------------------------------------------------------------
// 8. Display elevation
// ------------------------------------------------------------

Map.addLayer(
  dem.clip(studyRegion),
  {
    min: 3000,
    max: 6000,
    palette: [
      '00ff00',
      'ffff00',
      'ff9900',
      'ff0000',
      '9900ff'
    ]
  },
  'Elevation',
  false
);

// ------------------------------------------------------------
// 9. Calculate total candidate water area
// ------------------------------------------------------------

var area = ee.Image.pixelArea()
  .updateMask(connected)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: studyRegion,
    scale: 30,
    maxPixels: 1e10
  });

var areaKm2 = ee.Number(
  area.get('area')
).divide(1e6);

areaKm2.evaluate(function(value) {
  print(
    'Candidate water area (km²):',
    value
  );
});

// ------------------------------------------------------------
// 10. Count connected components
// ------------------------------------------------------------

var components = connected
  .connectedComponents({
    connectedness: ee.Kernel.plus(1),
    maxSize: 1024
  });

print(
  'Connected waterbody components:',
  components
);
