// ============================================================
// HIMALAYA-H2O
// PHASE 1 FINAL STUDY AREA + TERRAIN
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
// 4. Create high altitude mask
// ------------------------------------------------------------

var highAltitude = dem
  .gte(3000)
  .selfMask()
  .clip(studyRegion);

// ------------------------------------------------------------
// 5. Calculate slope
// ------------------------------------------------------------

var slope = ee.Terrain.slope(dem)
  .clip(studyRegion);

// ------------------------------------------------------------
// 6. Calculate high altitude area
// ------------------------------------------------------------

var highAltitudeArea = ee.Image.pixelArea()
  .updateMask(highAltitude)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: studyRegion,
    scale: 30,
    maxPixels: 1e10
  });

var highAltitudeAreaKm2 = ee.Number(
  highAltitudeArea.get('area')
).divide(1e6);

// ------------------------------------------------------------
// 7. Display study states
// ------------------------------------------------------------

Map.centerObject(studyRegion, 7);

Map.addLayer(
  studyStates,
  {
    color: 'red'
  },
  'Himachal Pradesh + Uttarakhand'
);

// ------------------------------------------------------------
// 8. Display elevation
// ------------------------------------------------------------

Map.addLayer(
  dem,
  {
    min: 500,
    max: 6000,
    palette: [
      '0b3d91',
      '2ca25f',
      'ffffbf',
      'f46d43',
      'a50026'
    ]
  },
  'Elevation'
);

// ------------------------------------------------------------
// 9. Display >=3000 m
// ------------------------------------------------------------

Map.addLayer(
  highAltitude,
  {
    palette: ['ffffff']
  },
  'Elevation >= 3000 m'
);

// ------------------------------------------------------------
// 10. Display slope
// ------------------------------------------------------------

Map.addLayer(
  slope,
  {
    min: 0,
    max: 60,
    palette: [
      'ffffff',
      'cccccc',
      '666666',
      '000000'
    ]
  },
  'Slope',
  false
);

// ------------------------------------------------------------
// 11. Print information
// ------------------------------------------------------------

print(
  'Selected states:',
  studyStates
);

print(
  'High-altitude area >= 3000 m (km²):',
  highAltitudeAreaKm2
);
