// ============================================================
// HIMALAYA-H2O
// 02F — Sentinel-2 Manual Review
// Current candidate: WB_312598_782548
// ============================================================


// ------------------------------------------------------------
// 1. CURRENT CANDIDATE
// ------------------------------------------------------------

// Candidate #64
var waterbodyId = 'WB_302099_801359';
var reviewLon = 80.135885;
var reviewLat = 30.209851;

var reviewPoint = ee.Geometry.Point([
  reviewLon,
  reviewLat
]);

var reviewArea = reviewPoint.buffer(500);


// ------------------------------------------------------------
// 2. INFORMATION
// ------------------------------------------------------------

print('==========================================');
print('HIMALAYA-H2O — SENTINEL-2 MANUAL REVIEW');
print('==========================================');

print('CURRENT CANDIDATE:', waterbodyId);
print('Coordinates:', [reviewLon, reviewLat]);
print('Review area:', reviewArea);


// ------------------------------------------------------------
// 3. SENTINEL-2
// ------------------------------------------------------------

var s2 = ee.ImageCollection(
  'COPERNICUS/S2_SR_HARMONIZED'
)
.filterDate(
  '2025-05-01',
  '2025-11-01'
)
.filterBounds(reviewPoint)
.filter(
  ee.Filter.lt(
    'CLOUDY_PIXEL_PERCENTAGE',
    20
  )
);

print(
  'Sentinel-2 images:',
  s2.size()
);


// ------------------------------------------------------------
// 4. SCL-BASED MASK
// ------------------------------------------------------------

// Sentinel-2 SCL classes retained:
//
// 4  = Vegetation
// 5  = Bare soil
// 6  = Water
// 11 = Snow / Ice
//
// We keep these classes for the manual-review workflow.
// Other SCL classes are masked out.

function maskS2(image) {

  var scl = image.select('SCL');

  var mask = scl.eq(4)
    .or(scl.eq(5))
    .or(scl.eq(6))
    .or(scl.eq(11));

  return image
    .updateMask(mask)
    .copyProperties(
      image,
      ['system:time_start']
    );
}


var s2Clear = s2.map(maskS2);

print(
  'Clear Sentinel-2 images:',
  s2Clear.size()
);


// ------------------------------------------------------------
// 5. SENTINEL-2 REFLECTANCE COMPOSITE
// ------------------------------------------------------------

// Median composite for spectral bands.
// Used for True Color and NDWI.

var composite = s2Clear.median();


// ------------------------------------------------------------
// 6. TRUE COLOR
// ------------------------------------------------------------

Map.centerObject(
  reviewArea,
  14
);

Map.addLayer(
  composite,
  {
    bands: [
      'B4',
      'B3',
      'B2'
    ],
    min: 0,
    max: 3000
  },
  'Sentinel-2 True Color'
);


// ------------------------------------------------------------
// 7. NDWI
// ------------------------------------------------------------
//
// NDWI = (Green - NIR) / (Green + NIR)
//
// Sentinel-2:
// B3 = Green
// B8 = Near Infrared
//

var ndwi = composite
  .normalizedDifference([
    'B3',
    'B8'
  ])
  .rename('NDWI');


Map.addLayer(
  ndwi,
  {
    min: -0.5,
    max: 0.8,
    palette: [
      '8c510a',
      'd8b365',
      'f6e8c3',
      'c7eae5',
      '5ab4ac',
      '01665e'
    ]
  },
  'NDWI'
);


// ------------------------------------------------------------
// 8. REVIEW AREA
// ------------------------------------------------------------

Map.addLayer(
  reviewArea,
  {
    color: 'yellow'
  },
  '500 m Review Area'
);


// ------------------------------------------------------------
// 9. CANDIDATE POINT
// ------------------------------------------------------------

Map.addLayer(
  reviewPoint,
  {
    color: 'red'
  },
  'Candidate'
);


// ------------------------------------------------------------
// 10. SCL COMPOSITE
// ------------------------------------------------------------
//
// SCL is categorical, so use MODE rather than MEDIAN.
//
// This gives the most frequently occurring SCL class
// at each pixel across the retained observations.
//

var sclComposite = s2Clear
  .select('SCL')
  .mode();


// ------------------------------------------------------------
// 11. SCL WATER — CLASS 6
// ------------------------------------------------------------

var sclWater = sclComposite
  .eq(6)
  .selfMask();


Map.addLayer(
  sclWater,
  {
    palette: [
      '0000ff'
    ]
  },
  'SCL Water (Class 6)',
  false
);


// ------------------------------------------------------------
// 12. SCL SNOW / ICE — CLASS 11
// ------------------------------------------------------------

var sclSnowIce = sclComposite
  .eq(11)
  .selfMask();


Map.addLayer(
  sclSnowIce,
  {
    palette: [
      'ffffff'
    ]
  },
  'SCL Snow/Ice (Class 11)',
  false
);


// ============================================================
// 13. TEMPORAL SCL FREQUENCY
// ============================================================


// ------------------------------------------------------------
// WATER FREQUENCY
// ------------------------------------------------------------
//
// For every retained Sentinel-2 observation:
//
// Water = 1
// Not water = 0
//
// Mean across observations gives the water-class frequency.
//

var sclWaterFrequency = s2Clear
  .map(function(image) {

    return image
      .select('SCL')
      .eq(6)
      .rename('water');

  })
  .mean()
  .rename('scl_water_frequency');


// ------------------------------------------------------------
// SNOW / ICE FREQUENCY
// ------------------------------------------------------------

var sclSnowFrequency = s2Clear
  .map(function(image) {

    return image
      .select('SCL')
      .eq(11)
      .rename('snow_ice');

  })
  .mean()
  .rename('scl_snow_frequency');


// ------------------------------------------------------------
// 14. DISPLAY WATER FREQUENCY
// ------------------------------------------------------------

Map.addLayer(
  sclWaterFrequency,
  {
    min: 0,
    max: 1,
    palette: [
      'ffffff',
      'c7e9f1',
      '67c5d9',
      '218c9e',
      '003c4a'
    ]
  },
  'SCL Water Frequency',
  false
);


// ------------------------------------------------------------
// 15. DISPLAY SNOW / ICE FREQUENCY
// ------------------------------------------------------------

Map.addLayer(
  sclSnowFrequency,
  {
    min: 0,
    max: 1,
    palette: [
      '000000',
      '555555',
      'aaaaaa',
      'dddddd',
      'ffffff'
    ]
  },
  'SCL Snow/Ice Frequency',
  false
);


// ============================================================
// 16. CANDIDATE STATISTICS
// ============================================================
//
// We use a 100 m buffer around the candidate point.
//
// These are local statistics for manual interpretation,
// not the automated candidate-level values from the
// full validation table.
//

var candidateArea = reviewPoint.buffer(100);


// ------------------------------------------------------------
// SCL WATER FREQUENCY
// ------------------------------------------------------------

var candidateWaterFrequency =
  sclWaterFrequency.reduceRegion({

    reducer: ee.Reducer.mean(),

    geometry: candidateArea,

    scale: 20,

    maxPixels: 1000000

  });


print(
  'Candidate SCL water frequency:',
  candidateWaterFrequency
);


// ------------------------------------------------------------
// SCL SNOW / ICE FREQUENCY
// ------------------------------------------------------------

var candidateSnowFrequency =
  sclSnowFrequency.reduceRegion({

    reducer: ee.Reducer.mean(),

    geometry: candidateArea,

    scale: 20,

    maxPixels: 1000000

  });


print(
  'Candidate SCL snow/ice frequency:',
  candidateSnowFrequency
);


// ============================================================
// 17. NDWI CANDIDATE STATISTICS
// ============================================================
//
// This gives us additional quantitative information for
// the candidate area.
//
// NDWI water signal threshold used in the project:
// NDWI >= 0.20
//

var ndwiWaterMask = ndwi
  .gte(0.20)
  .rename('ndwi_water');


var ndwiWaterFraction =
  ndwiWaterMask.reduceRegion({

    reducer: ee.Reducer.mean(),

    geometry: candidateArea,

    scale: 10,

    maxPixels: 1000000

  });


print(
  'Candidate NDWI water fraction (NDWI >= 0.20):',
  ndwiWaterFraction
);


// ------------------------------------------------------------
// NDWI MEAN
// ------------------------------------------------------------

var candidateNdwiMean =
  ndwi.reduceRegion({

    reducer: ee.Reducer.mean(),

    geometry: candidateArea,

    scale: 10,

    maxPixels: 1000000

  });


print(
  'Candidate mean NDWI:',
  candidateNdwiMean
);


// ------------------------------------------------------------
// NDWI MAXIMUM
// ------------------------------------------------------------

var candidateNdwiMax =
  ndwi.reduceRegion({

    reducer: ee.Reducer.max(),

    geometry: candidateArea,

    scale: 10,

    maxPixels: 1000000

  });


print(
  'Candidate maximum NDWI:',
  candidateNdwiMax
);


// ============================================================
// 18. END
// ============================================================

print('==========================================');
print('MANUAL REVIEW READY');
print('Candidate:', waterbodyId);
print('==========================================');
