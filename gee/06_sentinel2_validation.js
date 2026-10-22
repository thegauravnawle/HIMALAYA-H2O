// ============================================================
// HIMALAYA-H2O
// PHASE 2D — SENTINEL-2 VALIDATION
// ACTUAL CANDIDATE POLYGON
// ============================================================


// ------------------------------------------------------------
// 1. STUDY REGION
// ------------------------------------------------------------

var states = ee.FeatureCollection(
  'FAO/GAUL/2015/level1'
);

var studyStates = states
  .filter(
    ee.Filter.eq(
      'ADM0_NAME',
      'India'
    )
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

var studyRegion =
  studyStates.geometry();


// ------------------------------------------------------------
// 2. DEM
// ------------------------------------------------------------

var dem = ee.Image(
  'USGS/SRTMGL1_003'
).select('elevation');

var highAltitude =
  dem.gte(3000);


// ------------------------------------------------------------
// 3. JRC WATER
// ------------------------------------------------------------

var gsw = ee.Image(
  'JRC/GSW1_4/GlobalSurfaceWater'
);

var occurrence =
  gsw.select('occurrence');


// ------------------------------------------------------------
// 4. RECREATE PHASE 2C WATER CANDIDATES
// ------------------------------------------------------------

var water = occurrence
  .gte(50)
  .and(highAltitude)
  .selfMask()
  .clip(studyRegion);


// Remove small isolated groups

var connected = water
  .updateMask(
    water.connectedPixelCount(
      100,
      true
    ).gte(8)
  );


// Convert to polygons

var waterbodies = connected
  .toInt()
  .reduceToVectors({

    geometry: studyRegion,

    scale: 30,

    geometryType: 'polygon',

    eightConnected: true,

    labelProperty: 'water',

    reducer:
      ee.Reducer.countEvery(),

    maxPixels: 1e10,

    bestEffort: true

  });


// ------------------------------------------------------------
// 5. TEST CANDIDATE LOCATION
// ------------------------------------------------------------

var latitude =
  32.98819437633771;

var longitude =
  76.23576913178375;

var point =
  ee.Geometry.Point([
    longitude,
    latitude
  ]);


// ------------------------------------------------------------
// 6. FIND ACTUAL CANDIDATE POLYGON
// ------------------------------------------------------------

var candidate =
  waterbodies
    .filterBounds(point)
    .first();


// ------------------------------------------------------------
// 7. CANDIDATE GEOMETRY
// ------------------------------------------------------------

var candidateGeometry =
  candidate.geometry();


// Candidate area

var candidateAreaKm2 =
  candidateGeometry
    .area(1)
    .divide(1e6);


// ------------------------------------------------------------
// 8. SENTINEL-2
// ------------------------------------------------------------

var s2 =
  ee.ImageCollection(
    'COPERNICUS/S2_SR_HARMONIZED'
  )
  .filterBounds(
    candidateGeometry
  )
  .filterDate(
    '2025-07-01',
    '2025-10-01'
  );


// ------------------------------------------------------------
// 9. CLOUD SCORE+
// ------------------------------------------------------------

var csPlus =
  ee.ImageCollection(
    'GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED'
  );

var QA_BAND =
  'cs_cdf';

var CLEAR_THRESHOLD =
  0.60;


// ------------------------------------------------------------
// 10. APPLY CLOUD MASK
// ------------------------------------------------------------

var s2Clear =
  s2
    .linkCollection(
      csPlus,
      [QA_BAND]
    )
    .map(
      function(image) {

        return image.updateMask(
          image
            .select(QA_BAND)
            .gte(
              CLEAR_THRESHOLD
            )
        );

      }
    );


// ------------------------------------------------------------
// 11. CLEAR SUMMER COMPOSITE
// ------------------------------------------------------------

var image =
  s2Clear.median();


// ------------------------------------------------------------
// 12. NDWI
// ------------------------------------------------------------

var ndwi =
  image
    .normalizedDifference([
      'B3',
      'B8'
    ])
    .rename('NDWI');


// Working NDWI threshold

var waterThreshold =
  0.20;

var possibleWater =
  ndwi
    .gte(waterThreshold)
    .selfMask();


// ------------------------------------------------------------
// 13. MULTI-DATE SCL WATER FREQUENCY
// ------------------------------------------------------------

var sclFrequency =
  s2Clear.map(
    function(image) {

      var scl =
        image.select('SCL');

      var water =
        scl
          .eq(6)
          .rename('water');

      var snowIce =
        scl
          .eq(11)
          .rename('snow_ice');

      return water
        .addBands(
          snowIce
        );

    }
  );


// Water frequency

var waterFrequency =
  sclFrequency
    .select('water')
    .mean();


// Snow / ice frequency

var snowIceFrequency =
  sclFrequency
    .select('snow_ice')
    .mean();


// ------------------------------------------------------------
// 14. CANDIDATE NDWI STATISTICS
// ------------------------------------------------------------

var ndwiStats =
  ndwi.reduceRegion({

    reducer:
      ee.Reducer.mean()
        .combine({
          reducer2:
            ee.Reducer.max(),
          sharedInputs: true
        })
        .combine({
          reducer2:
            ee.Reducer.percentile(
              [90]
            ),
          sharedInputs: true
        }),

    geometry:
      candidateGeometry,

    scale: 10,

    maxPixels: 1e7

  });


// ------------------------------------------------------------
// 15. NDWI WATER FRACTION
// ------------------------------------------------------------

var ndwiWaterFraction =
  ndwi
    .gte(waterThreshold)
    .reduceRegion({

      reducer:
        ee.Reducer.mean(),

      geometry:
        candidateGeometry,

      scale: 10,

      maxPixels: 1e7

    });


// ------------------------------------------------------------
// 16. SCL WATER FREQUENCY
// ------------------------------------------------------------

var waterFrequencyStats =
  waterFrequency
    .reduceRegion({

      reducer:
        ee.Reducer.mean(),

      geometry:
        candidateGeometry,

      scale: 20,

      maxPixels: 1e7

    });


// ------------------------------------------------------------
// 17. SCL SNOW / ICE FREQUENCY
// ------------------------------------------------------------

var snowIceFrequencyStats =
  snowIceFrequency
    .reduceRegion({

      reducer:
        ee.Reducer.mean(),

      geometry:
        candidateGeometry,

      scale: 20,

      maxPixels: 1e7

    });


// ------------------------------------------------------------
// 18. MAP
// ------------------------------------------------------------

Map.centerObject(
  candidateGeometry,
  15
);


// True colour

Map.addLayer(
  image,
  {
    bands: [
      'B4',
      'B3',
      'B2'
    ],

    min: 0,

    max: 3000

  },
  'Sentinel-2 Clear Summer Composite'
);


// NDWI

Map.addLayer(
  ndwi,
  {
    min: -1,

    max: 1,

    palette: [
      'brown',
      'white',
      'blue'
    ]

  },
  'NDWI'
);


// NDWI > 0.20

Map.addLayer(
  possibleWater,
  {
    palette: [
      '0000ff'
    ]

  },
  'NDWI > 0.20'
);


// SCL water frequency

Map.addLayer(
  waterFrequency,
  {
    min: 0,

    max: 1,

    palette: [
      'ffffff',
      '99ccff',
      '0066ff',
      '000066'
    ]

  },
  'Water Frequency'
);


// Snow / ice frequency

Map.addLayer(
  snowIceFrequency,
  {
    min: 0,

    max: 1,

    palette: [
      'ffffff',
      '00ffff',
      '0000ff'
    ]

  },
  'Snow/Ice Frequency',
  false
);


// Actual candidate polygon

Map.addLayer(
  candidateGeometry,
  {
    color: 'yellow'
  },
  'ACTUAL CANDIDATE'
);


// Candidate point

Map.addLayer(
  point,
  {
    color: 'red'
  },
  'Candidate Centroid'
);


// ------------------------------------------------------------
// 19. RESULTS
// ------------------------------------------------------------

print(
  '========== CANDIDATE VALIDATION =========='
);

print(
  'Candidate area (km²):',
  candidateAreaKm2
);

print(
  'Sentinel-2 images:',
  s2.size()
);

print(
  'Clear composite images:',
  s2Clear.size()
);

print(
  'Candidate latitude:',
  latitude
);

print(
  'Candidate longitude:',
  longitude
);

print(
  'NDWI statistics:',
  ndwiStats
);

print(
  'NDWI > 0.20 fraction:',
  ndwiWaterFraction
);

print(
  'Multi-date SCL water frequency:',
  waterFrequencyStats
);

print(
  'Multi-date SCL snow/ice frequency:',
  snowIceFrequencyStats
);

// ============================================================
// 20. CLEAN NUMERIC OUTPUT
// ============================================================

print(
  'Candidate area km2:',
  candidateAreaKm2
);

print(
  'NDWI mean:',
  ndwiStats.get('NDWI_mean')
);

print(
  'NDWI maximum:',
  ndwiStats.get('NDWI_max')
);

print(
  'NDWI 90th percentile:',
  ndwiStats.get('NDWI_p90')
);

print(
  'NDWI > 0.20 fraction:',
  ndwiWaterFraction.get('NDWI')
);

print(
  'SCL water frequency:',
  waterFrequencyStats.get('water')
);

print(
  'SCL snow/ice frequency:',
  snowIceFrequencyStats.get('snow_ice')
);
