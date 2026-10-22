// ================================================================
// HIMALAYA-H2O
// 02E — AUTOMATED SENTINEL-2 VALIDATION
//
// Purpose:
// Automatically screen high-altitude persistent-water candidates
// using Sentinel-2 NDWI and Scene Classification Layer (SCL).
//
// IMPORTANT:
// These are screening results, NOT confirmed glacial lakes.
//
// Study area:
// Himachal Pradesh + Uttarakhand
//
// Candidate source:
// JRC Global Surface Water occurrence >= 50%
// + elevation >= 3000 m
// + connected-pixel filtering
//
// Sentinel-2:
// COPERNICUS/S2_SR_HARMONIZED
// ================================================================


// ================================================================
// 1. SETTINGS
// ================================================================

var START_DATE = '2025-05-01';
var END_DATE   = '2025-11-01';

var ALTITUDE_THRESHOLD = 3000;

// JRC water threshold
var OCCURRENCE_THRESHOLD = 50;

// Connected-pixel threshold
var MIN_CONNECTED_PIXELS = 8;

// Minimum polygon area
var MIN_AREA_KM2 = 0.01;

// NDWI threshold
var NDWI_THRESHOLD = 0.20;

// Sentinel-2 metadata cloud threshold
var CLOUD_THRESHOLD = 20;

// IMPORTANT MEMORY SETTINGS
var VALIDATION_SCALE = 20;
var TILE_SCALE = 8;
var MAX_PIXELS_PER_REGION = 2000000;


// ================================================================
// 2. STUDY REGION
// ================================================================

var states =
  ee.FeatureCollection(
    'FAO/GAUL/2015/level1'
  );

var studyStates =
  states
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


// ================================================================
// 3. DEM
// ================================================================

var dem =
  ee.Image(
    'USGS/SRTMGL1_003'
  ).select('elevation');

var highAltitude =
  dem
    .gte(ALTITUDE_THRESHOLD);


// ================================================================
// 4. JRC WATER BASELINE
// ================================================================

var gsw =
  ee.Image(
    'JRC/GSW1_4/GlobalSurfaceWater'
  );

var occurrence =
  gsw.select('occurrence');


// Persistent historical water
var persistentWater =
  occurrence
    .gte(OCCURRENCE_THRESHOLD)
    .and(highAltitude)
    .selfMask()
    .clip(studyRegion);


// ================================================================
// 5. CONNECTED WATERBODY CANDIDATES
// ================================================================

// Count connected pixels.
//
// eightConnected = true means diagonal pixels are also connected.
var connectedPixels =
  persistentWater
    .connectedPixelCount(
      100,
      true
    );


// Keep sufficiently connected water pixels.
var connectedWater =
  persistentWater
    .updateMask(
      connectedPixels.gte(
        MIN_CONNECTED_PIXELS
      )
    );


// ================================================================
// 6. CONVERT CANDIDATES TO POLYGONS
// ================================================================

var candidatePolygons =
  connectedWater.reduceToVectors({
    geometry: studyRegion,
    scale: 30,
    geometryType: 'polygon',
    eightConnected: true,
    labelProperty: 'water',
    reducer: ee.Reducer.countEvery(),
    maxPixels: 1e10,
    bestEffort: true
  });


// ================================================================
// 7. CALCULATE CANDIDATE AREA
// ================================================================

var candidatesWithArea =
  candidatePolygons.map(
    function(feature) {

      var areaKm2 =
        feature
          .geometry()
          .area(
            ee.ErrorMargin(1)
          )
          .divide(1e6);

      return feature.set(
        'area_km2',
        areaKm2
      );
    }
  );


// Remove very tiny polygons
var candidates =
  candidatesWithArea.filter(
    ee.Filter.gte(
      'area_km2',
      MIN_AREA_KM2
    )
  );


// ================================================================
// 8. ADD WATERBODY IDs
// ================================================================

var candidatesWithID =
  candidates.map(
    function(feature) {

      var centroid =
        feature
          .geometry()
          .centroid(
            ee.ErrorMargin(1)
          );

      var coords =
        centroid.coordinates();

      var longitude =
        ee.Number(
          coords.get(0)
        );

      var latitude =
        ee.Number(
          coords.get(1)
        );

      // Convert coordinates into a simple ID.
      var lonID =
        longitude
          .multiply(10000)
          .round()
          .format('%d');

      var latID =
        latitude
          .multiply(10000)
          .round()
          .format('%d');

      var waterbodyID =
        ee.String('WB_')
          .cat(latID)
          .cat('_')
          .cat(lonID);

      return feature.set({
        'waterbody_id':
          waterbodyID,

        'latitude':
          latitude,

        'longitude':
          longitude
      });
    }
  );


// ================================================================
// 9. ELEVATION STATISTICS FOR CANDIDATES
// ================================================================

var elevationStats =
  dem.reduceRegions({
    collection:
      candidatesWithID,

    reducer:
      ee.Reducer.mean()
        .combine({
          reducer2:
            ee.Reducer.minMax(),

          sharedInputs: true
        }),

    scale: 30,

    tileScale: 4
  });


var finalCandidates =
  elevationStats.map(
    function(feature) {

      return feature.set({
        'mean_elevation_m':
          feature.get('mean'),

        'min_elevation_m':
          feature.get('min'),

        'max_elevation_m':
          feature.get('max')
      });
    }
  );


// ================================================================
// 10. PRINT CANDIDATE INFORMATION
// ================================================================

print(
  '================================'
);

print(
  'HIMALAYA-H2O AUTOMATED VALIDATION'
);

print(
  '================================'
);

print(
  'Candidate count:',
  finalCandidates.size()
);


// ================================================================
// 11. SENTINEL-2 COLLECTION
// ================================================================

var s2 =
  ee.ImageCollection(
    'COPERNICUS/S2_SR_HARMONIZED'
  )
  .filterBounds(
    studyRegion
  )
  .filterDate(
    START_DATE,
    END_DATE
  )
  .filter(
    ee.Filter.lt(
      'CLOUDY_PIXEL_PERCENTAGE',
      CLOUD_THRESHOLD
    )
  );


// ================================================================
// 12. PREPARE SENTINEL-2 IMAGES
// ================================================================
//
// SCL classes:
//
// 4  = Vegetation
// 5  = Bare soil
// 6  = Water
// 11 = Snow / Ice
//
// We keep these classes and mask:
//
// 1 = Saturated / defective
// 2 = Dark area
// 3 = Cloud shadow
// 7 = Low probability cloud / unclassified
// 8 = Medium probability cloud
// 9 = High probability cloud
// 10 = Cirrus
//
// Sentinel-2 SCL is a 20 m band.
// ================================================================

var preparedS2 =
  s2.map(
    function(image) {

      var scl =
        image.select('SCL');

      // Clear observation mask.
      var clear =
        scl.eq(4)
          .or(scl.eq(5))
          .or(scl.eq(6))
          .or(scl.eq(11));

      // ------------------------------------------------------------
      // NDWI
      // Green = B3
      // NIR   = B8
      // ------------------------------------------------------------

      var ndwi =
        image
          .normalizedDifference([
            'B3',
            'B8'
          ])
          .rename('NDWI')
          .updateMask(clear);


      // ------------------------------------------------------------
      // NDWI water candidate
      // ------------------------------------------------------------

      var ndwiWater =
        ndwi
          .gte(NDWI_THRESHOLD)
          .rename(
            'ndwi_water'
          )
          .updateMask(clear);


      // ------------------------------------------------------------
      // SCL water
      // ------------------------------------------------------------

      var sclWater =
        scl
          .eq(6)
          .rename(
            'scl_water'
          )
          .updateMask(clear);


      // ------------------------------------------------------------
      // SCL snow / ice
      // ------------------------------------------------------------

      var sclSnow =
        scl
          .eq(11)
          .rename(
            'scl_snow'
          )
          .updateMask(clear);


      // ------------------------------------------------------------
      // Valid observation
      //
      // 1 = clear observation
      // 0 = not clear
      //
      // This band is NOT masked so that mean() gives the proportion
      // of clear observations.
      // ------------------------------------------------------------

      var validObservation =
        clear
          .unmask(0)
          .rename(
            'valid_observation'
          );


      return ee.Image.cat([
        ndwi,
        ndwiWater,
        sclWater,
        sclSnow,
        validObservation
      ]).copyProperties(
        image,
        image.propertyNames()
      );
    }
  );


print(
  'Sentinel-2 scenes:',
  s2.size()
);

print(
  'Validation scale:',
  VALIDATION_SCALE
);

print(
  'Max pixels per region:',
  MAX_PIXELS_PER_REGION
);


// ================================================================
// 13. NDWI MEDIAN COMPOSITE
// ================================================================

var ndwiMedian =
  preparedS2
    .select('NDWI')
    .median()
    .rename(
      'ndwi_median'
    );


// ================================================================
// 14. NDWI WATER FRACTION
// ================================================================
//
// This is the fraction of each candidate polygon where the
// median NDWI composite is >= NDWI_THRESHOLD.
//
// IMPORTANT:
// This is a spatial fraction, NOT temporal persistence.
// ================================================================

var ndwiWaterMedian =
  ndwiMedian
    .gte(NDWI_THRESHOLD)
    .rename(
      'ndwi_water_fraction'
    );


// ================================================================
// 15. SCL WATER FREQUENCY
// ================================================================
//
// Because cloudy/non-clear observations are masked in scl_water,
// mean() calculates the proportion of CLEAR observations that
// were classified as water.
//
// IMPORTANT:
// No .resample('nearest') is used here.
// ================================================================

var sclWaterFrequency =
  preparedS2
    .select('scl_water')
    .mean()
    .rename(
      'scl_water_frequency'
    );


// ================================================================
// 16. SCL SNOW / ICE FREQUENCY
// ================================================================
//
// Same principle as SCL water.
//
// IMPORTANT:
// No .resample('nearest') is used here.
// ================================================================

var sclSnowFrequency =
  preparedS2
    .select('scl_snow')
    .mean()
    .rename(
      'scl_snow_frequency'
    );


// ================================================================
// 17. CLEAR OBSERVATION FREQUENCY
// ================================================================

var clearObservationFrequency =
  preparedS2
    .select(
      'valid_observation'
    )
    .mean()
    .rename(
      'clear_observation_frequency'
    );


// ================================================================
// 18. COMBINE VALIDATION LAYERS
// ================================================================

var validationImage =
  ee.Image.cat([
    ndwiMedian,
    ndwiWaterMedian,
    sclWaterFrequency,
    sclSnowFrequency,
    clearObservationFrequency
  ]);


// ================================================================
// 19. VALIDATION REDUCER
// ================================================================

var validationReducer =
  ee.Reducer.mean()
    .combine({
      reducer2:
        ee.Reducer.max(),

      sharedInputs: false
    })
    .combine({
      reducer2:
        ee.Reducer.percentile([90]),

      sharedInputs: false
    });


// ================================================================
// 20. REDUCE VALIDATION IMAGE OVER ALL CANDIDATES
// ================================================================
//
// IMPORTANT:
//
// reduceRegions uses:
//
// scale
// tileScale
// maxPixelsPerRegion
//
// NOT maxPixels.
//
// ================================================================

var validationStats =
  validationImage.reduceRegions({
    collection:
      finalCandidates,

    reducer:
      ee.Reducer.mean()
        .combine({
          reducer2:
            ee.Reducer.max(),

          sharedInputs: false
        })
        .combine({
          reducer2:
            ee.Reducer.percentile([90]),

          sharedInputs: false
        }),

    scale:
      VALIDATION_SCALE,

    tileScale:
      TILE_SCALE,

    maxPixelsPerRegion:
      MAX_PIXELS_PER_REGION
  });


// ================================================================
// 21. RENAME VALIDATION PROPERTIES
// ================================================================

var validatedCandidates =
  validationStats.map(
    function(feature) {

      return feature.set({

        // NDWI
        'ndwi_mean':
          feature.get(
            'ndwi_median_mean'
          ),

        'ndwi_max':
          feature.get(
            'ndwi_median_max'
          ),

        'ndwi_p90':
          feature.get(
            'ndwi_median_p90'
          ),

        // Spatial NDWI water fraction
        'ndwi_water_fraction':
          feature.get(
            'ndwi_water_fraction_mean'
          ),

        // SCL
        'scl_water_frequency':
          feature.get(
            'scl_water_frequency_mean'
          ),

        'scl_snow_frequency':
          feature.get(
            'scl_snow_frequency_mean'
          ),

        // Clear observations
        'clear_observation_frequency':
          feature.get(
            'clear_observation_frequency_mean'
          )
      });
    }
  );


// ================================================================
// 22. SCREENING CLASSIFICATION
// ================================================================
//
// A — Stronger water evidence
//
// NDWI water fraction >= 0.50
// AND
// SCL water frequency >= 0.25
//
// ---------------------------------------------------------------
//
// B — Possible water, NDWI dominant
//
// NDWI water fraction >= 0.50
// AND
// SCL water frequency < 0.25
// AND
// snow frequency < 0.25
//
// ---------------------------------------------------------------
//
// C — Possible water, SCL dominant
//
// SCL water frequency >= 0.50
// AND
// NDWI water fraction < 0.50
//
// ---------------------------------------------------------------
//
// D — Weak / uncertain
//
// Everything else.
// ================================================================

var classifiedCandidates =
  validatedCandidates.map(
    function(feature) {

      var ndwiFraction =
        ee.Number(
          feature.get(
            'ndwi_water_fraction'
          )
        );

      var sclWater =
        ee.Number(
          feature.get(
            'scl_water_frequency'
          )
        );

      var snow =
        ee.Number(
          feature.get(
            'scl_snow_frequency'
          )
        );


      var className =
        ee.Algorithms.If(
          ndwiFraction.gte(0.50)
            .and(
              sclWater.gte(0.25)
            ),

          'A',

          ee.Algorithms.If(
            ndwiFraction.gte(0.50)
              .and(
                sclWater.lt(0.25)
              )
              .and(
                snow.lt(0.25)
              ),

            'B',

            ee.Algorithms.If(
              sclWater.gte(0.50)
                .and(
                  ndwiFraction.lt(0.50)
                ),

              'C',

              'D'
            )
          )
        );


      var snowFlag =
        ee.Algorithms.If(
          snow.gte(0.25),
          'HIGH_SNOW_ICE',
          'LOW_SNOW_ICE'
        );


      return feature.set({
        'screening_class':
          className,

        'snow_flag':
          snowFlag
      });
    }
  );


// ================================================================
// 23. PRINT FINAL VALIDATION TABLE
// ================================================================

print(
  'FIRST VALIDATED CANDIDATE:',
  classifiedCandidates.first()
);

print(
  'FIRST 20 VALIDATED CANDIDATES:',
  classifiedCandidates.limit(20)
);

print(
  'FINAL VALIDATION TABLE:',
  classifiedCandidates
);


// ================================================================
// 24. SCREENING COUNTS
// ================================================================

var classA =
  classifiedCandidates.filter(
    ee.Filter.eq(
      'screening_class',
      'A'
    )
  );

var classB =
  classifiedCandidates.filter(
    ee.Filter.eq(
      'screening_class',
      'B'
    )
  );

var classC =
  classifiedCandidates.filter(
    ee.Filter.eq(
      'screening_class',
      'C'
    )
  );

var classD =
  classifiedCandidates.filter(
    ee.Filter.eq(
      'screening_class',
      'D'
    )
  );


print(
  '================================'
);

print(
  'SCREENING CLASS COUNTS'
);

print(
  '================================'
);

print(
  'A — Stronger water evidence:',
  classA.size()
);

print(
  'B — Possible water, NDWI dominant:',
  classB.size()
);

print(
  'C — Possible water, SCL dominant:',
  classC.size()
);

print(
  'D — Weak / uncertain:',
  classD.size()
);


// ================================================================
// 25. PRINT REVIEW COLLECTIONS
// ================================================================

print(
  'STRONGER WATER EVIDENCE CANDIDATES:',
  classA.limit(20)
);

print(
  'POSSIBLE WATER — NDWI DOMINANT:',
  classB.limit(20)
);

print(
  'POSSIBLE WATER — SCL DOMINANT:',
  classC.limit(20)
);

print(
  'WEAK / UNCERTAIN CANDIDATES:',
  classD.limit(20)
);


// ================================================================
// 26. MAP
// ================================================================

Map.centerObject(
  studyRegion,
  7
);


// Study states
Map.addLayer(
  studyStates,
  {
    color: 'red'
  },
  'Study States',
  false
);


// Elevation
Map.addLayer(
  dem.clip(studyRegion),
  {
    min: 3000,
    max: 6000,
    palette: [
      '0b3d91',
      '2ca25f',
      'ffffbf',
      'f46d43',
      'a50026'
    ]
  },
  'Elevation',
  false
);


// All candidate polygons
Map.addLayer(
  finalCandidates,
  {
    color: 'yellow'
  },
  'All Candidates',
  false
);


// NDWI median
Map.addLayer(
  ndwiMedian.clip(studyRegion),
  {
    min: -0.5,
    max: 1,
    palette: [
      '8c510a',
      'f6e8c3',
      'c7eae5',
      '01665e'
    ]
  },
  'Median NDWI',
  false
);


// SCL water frequency
Map.addLayer(
  sclWaterFrequency.clip(studyRegion),
  {
    min: 0,
    max: 1,
    palette: [
      'ffffff',
      '9ecae1',
      '2171b5'
    ]
  },
  'SCL Water Frequency',
  false
);


// SCL snow frequency
Map.addLayer(
  sclSnowFrequency.clip(studyRegion),
  {
    min: 0,
    max: 1,
    palette: [
      'ffffff',
      'bdbdbd',
      '636363'
    ]
  },
  'SCL Snow/Ice Frequency',
  false
);


// Class A
Map.addLayer(
  classA.style({
    color: '00ff00',
    fillColor: '00000000',
    width: 2
  }),
  {},
  'A — Stronger Water Evidence'
);


// Class B
Map.addLayer(
  classB.style({
    color: 'ffff00',
    fillColor: '00000000',
    width: 2
  }),
  {},
  'B — Possible Water NDWI'
);


// Class C
Map.addLayer(
  classC.style({
    color: '00ffff',
    fillColor: '00000000',
    width: 2
  }),
  {},
  'C — Possible Water SCL'
);


// Class D
Map.addLayer(
  classD.style({
    color: 'ff0000',
    fillColor: '00000000',
    width: 1
  }),
  {},
  'D — Weak / Uncertain',
  false
);


// ================================================================
// 27. EXPORT FULL VALIDATION TABLE
// ================================================================

Export.table.toDrive({
  collection:
    classifiedCandidates,

  description:
    'HIMALAYA_H2O_S2_Automated_Validation',

  fileFormat:
    'CSV'
});


// ================================================================
// 28. EXPORT REVIEW CANDIDATES
// ================================================================
//
// Excludes class D.
//
// This gives us candidates that deserve manual investigation.
//
// ================================================================

var reviewCandidates =
  classifiedCandidates.filter(
    ee.Filter.neq(
      'screening_class',
      'D'
    )
  );


Export.table.toDrive({
  collection:
    reviewCandidates,

  description:
    'HIMALAYA_H2O_S2_Review_Candidates',

  fileFormat:
    'CSV'
});


// ================================================================
// 29. FINAL STATUS
// ================================================================

print(
  '================================'
);

print(
  'AUTOMATED VALIDATION COMPLETE'
);

print(
  '================================'
);

print(
  'Total candidates:',
  classifiedCandidates.size()
);

print(
  'Review candidates (A+B+C):',
  reviewCandidates.size()
);

print(
  'CSV exports created:',
  2
);

print(
  'NOTE: Screening classes are project-defined',
  'and do not represent confirmed glacial lakes.'
);
